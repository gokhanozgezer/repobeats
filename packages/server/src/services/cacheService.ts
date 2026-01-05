import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { type CommitEvent, CacheError } from '@repobeats/shared'

interface CacheEntry {
  head: string
  since?: string
  until?: string
  maxCommits: number
  commits: CommitEvent[]
  cachedAt: number
}

export class CacheService {
  private cacheDir: string
  private maxAge = 3600000

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir ?? join(homedir(), '.cache', 'repobeats')
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true })
      }
    } catch (error) {
      throw new CacheError(`Failed to create cache directory: ${error}`)
    }
  }

  private getCacheKey(repoPath: string, options: { since?: string; until?: string; maxCommits: number }): string {
    const data = `${repoPath}|${options.since ?? ''}|${options.until ?? ''}|${options.maxCommits}`
    return createHash('sha256').update(data).digest('hex').slice(0, 16)
  }

  private getRepoCacheDir(repoPath: string): string {
    const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 12)
    const dir = join(this.cacheDir, repoHash)

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    return dir
  }

  get(
    repoPath: string,
    head: string,
    options: { since?: string; until?: string; maxCommits: number }
  ): CommitEvent[] | null {
    try {
      const cacheKey = this.getCacheKey(repoPath, options)
      const repoCacheDir = this.getRepoCacheDir(repoPath)
      const cacheFile = join(repoCacheDir, `${cacheKey}.json`)

      if (!existsSync(cacheFile)) {
        return null
      }

      const content = readFileSync(cacheFile, 'utf-8')
      const entry: CacheEntry = JSON.parse(content)

      if (entry.head !== head) {
        unlinkSync(cacheFile)
        return null
      }

      if (Date.now() - entry.cachedAt > this.maxAge) {
        unlinkSync(cacheFile)
        return null
      }

      return entry.commits
    } catch {
      return null
    }
  }

  set(
    repoPath: string,
    head: string,
    options: { since?: string; until?: string; maxCommits: number },
    commits: CommitEvent[]
  ): void {
    try {
      const cacheKey = this.getCacheKey(repoPath, options)
      const repoCacheDir = this.getRepoCacheDir(repoPath)
      const cacheFile = join(repoCacheDir, `${cacheKey}.json`)

      const entry: CacheEntry = {
        head,
        since: options.since,
        until: options.until,
        maxCommits: options.maxCommits,
        commits,
        cachedAt: Date.now()
      }

      writeFileSync(cacheFile, JSON.stringify(entry))
    } catch (error) {
      console.warn(`Cache write failed: ${error}`)
    }
  }

  invalidate(repoPath: string): void {
    try {
      const repoCacheDir = this.getRepoCacheDir(repoPath)

      if (existsSync(repoCacheDir)) {
        const files = readdirSync(repoCacheDir)
        for (const file of files) {
          unlinkSync(join(repoCacheDir, file))
        }
      }
    } catch (error) {
      console.warn(`Cache invalidation failed: ${error}`)
    }
  }

  clear(): void {
    try {
      if (existsSync(this.cacheDir)) {
        const dirs = readdirSync(this.cacheDir)
        for (const dir of dirs) {
          const dirPath = join(this.cacheDir, dir)
          const files = readdirSync(dirPath)
          for (const file of files) {
            unlinkSync(join(dirPath, file))
          }
        }
      }
    } catch (error) {
      console.warn(`Cache clear failed: ${error}`)
    }
  }
}
