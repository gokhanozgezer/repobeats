import { simpleGit, SimpleGit } from 'simple-git'
import { basename } from 'node:path'
import {
  type CommitEvent,
  type RepoSummary,
  RepoNotFoundError,
  GitCommandError,
  parseGitDate
} from '@repobeats/shared'

export interface GetCommitsOptions {
  since?: string
  until?: string
  maxCommits?: number
  includeStats?: boolean
}

export class GitService {
  private git: SimpleGit
  private repoPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
    this.git = simpleGit(repoPath)
  }

  async validate(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo()
      if (!isRepo) {
        throw new RepoNotFoundError(this.repoPath)
      }
      return true
    } catch (error) {
      if (error instanceof RepoNotFoundError) throw error
      throw new GitCommandError('checkIsRepo', String(error))
    }
  }

  async getSummary(): Promise<RepoSummary> {
    try {
      await this.validate()

      const [branch, head, commits] = await Promise.all([
        this.git.revparse(['--abbrev-ref', 'HEAD']),
        this.git.revparse(['HEAD']),
        this.getCommits({ maxCommits: 1000, includeStats: true })
      ])

      const authors = new Map<string, { email?: string; count: number }>()
      let totalAdditions = 0
      let totalDeletions = 0
      let totalFilesChanged = 0
      let earliest = Infinity
      let latest = -Infinity

      for (const commit of commits) {
        const name = commit.authorName ?? 'Unknown'
        const existing = authors.get(name)
        if (existing) {
          existing.count++
        } else {
          authors.set(name, { email: commit.authorEmail, count: 1 })
        }

        totalAdditions += commit.additions ?? 0
        totalDeletions += commit.deletions ?? 0
        totalFilesChanged += commit.filesChanged ?? 0

        if (commit.timestamp < earliest) earliest = commit.timestamp
        if (commit.timestamp > latest) latest = commit.timestamp
      }

      return {
        name: basename(this.repoPath),
        path: this.repoPath,
        head: head.trim(),
        branch: branch.trim(),
        stats: {
          totalCommits: commits.length,
          totalAdditions,
          totalDeletions,
          totalFilesChanged,
          dateRange: {
            earliest: earliest === Infinity ? Date.now() : earliest,
            latest: latest === -Infinity ? Date.now() : latest
          },
          authors: [...authors.entries()]
            .map(([name, { email, count }]) => ({ name, email, commitCount: count }))
            .sort((a, b) => b.commitCount - a.commitCount)
        }
      }
    } catch (error) {
      if (error instanceof RepoNotFoundError) throw error
      throw new GitCommandError('getSummary', String(error))
    }
  }

  async getCommits(options: GetCommitsOptions = {}): Promise<CommitEvent[]> {
    try {
      await this.validate()

      const { since, until, maxCommits = 1000, includeStats = false } = options

      if (includeStats) {
        return this.getCommitsWithStats(since, until, maxCommits)
      }

      const logOptions: string[] = [
        `--max-count=${maxCommits}`,
        '--format=%H|%an|%ae|%aI|%s'
      ]

      if (since) logOptions.push(`--since=${since}`)
      if (until) logOptions.push(`--until=${until}`)

      const logResult = await this.git.raw(['log', ...logOptions])

      if (!logResult.trim()) {
        return []
      }

      const lines = logResult.trim().split('\n').filter(Boolean)

      return lines.map(line => {
        const parts = line.split('|')
        const sha = parts[0] ?? ''
        const authorName = parts[1]
        const authorEmail = parts[2] || undefined
        const dateStr = parts[3] ?? ''
        const message = parts.slice(4).join('|')
        return {
          sha,
          authorName,
          authorEmail,
          timestamp: parseGitDate(dateStr),
          message,
          filesChanged: undefined,
          additions: undefined,
          deletions: undefined
        }
      })
    } catch (error) {
      throw new GitCommandError('getCommits', String(error))
    }
  }

  private async getCommitsWithStats(since?: string, until?: string, maxCommits = 1000): Promise<CommitEvent[]> {
    const logOptions: string[] = [
      `--max-count=${maxCommits}`,
      '--format=COMMIT_START%H|%an|%ae|%aI|%s',
      '--shortstat'
    ]

    if (since) logOptions.push(`--since=${since}`)
    if (until) logOptions.push(`--until=${until}`)

    const logResult = await this.git.raw(['log', ...logOptions])

    if (!logResult.trim()) {
      return []
    }

    const commits: CommitEvent[] = []
    const blocks = logResult.split('COMMIT_START').filter(Boolean)

    for (const block of blocks) {
      const lines = block.trim().split('\n').filter(line => line.trim() !== '')
      const headerLine = lines[0] ?? ''
      // Stats line can be lines[1] or might have empty lines before it
      const statLine = lines.find(line => line.includes('changed')) ?? ''

      const parts = headerLine.split('|')
      const sha = parts[0] ?? ''
      const authorName = parts[1]
      const authorEmail = parts[2] || undefined
      const dateStr = parts[3] ?? ''
      const message = parts.slice(4).join('|')

      let filesChanged = 0
      let additions = 0
      let deletions = 0

      if (statLine) {
        const filesMatch = statLine.match(/(\d+)\s+files?\s+changed/)
        const addMatch = statLine.match(/(\d+)\s+insertions?\(\+\)/)
        const delMatch = statLine.match(/(\d+)\s+deletions?\(-\)/)

        if (filesMatch?.[1]) filesChanged = parseInt(filesMatch[1], 10)
        if (addMatch?.[1]) additions = parseInt(addMatch[1], 10)
        if (delMatch?.[1]) deletions = parseInt(delMatch[1], 10)
      }

      commits.push({
        sha,
        authorName,
        authorEmail,
        timestamp: parseGitDate(dateStr),
        message,
        filesChanged,
        additions,
        deletions
      })
    }

    return commits
  }

  async getHead(): Promise<string> {
    const head = await this.git.revparse(['HEAD'])
    return head.trim()
  }

  async getBranch(): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD'])
    return branch.trim()
  }
}
