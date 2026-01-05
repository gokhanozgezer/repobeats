import { Command } from 'commander'
import { resolve, basename } from 'node:path'
import { existsSync } from 'node:fs'
import chalk from 'chalk'
import ora from 'ora'
import { DEFAULT_MAX_COMMITS, formatDate, formatDuration } from '@repobeats/shared'

interface InspectOptions {
  since?: string
  until?: string
  maxCommits: number
  json: boolean
}

export function createInspectCommand(): Command {
  return new Command('inspect')
    .description('Display commit statistics and mapping preview')
    .argument('[path]', 'Path to git repository', process.cwd())
    .option('--since <rev>', 'Start commit (revision or date)')
    .option('--until <rev>', 'End commit (revision or date)')
    .option('--max-commits <number>', 'Maximum commits to process', (val) => parseInt(val, 10), DEFAULT_MAX_COMMITS)
    .option('--json', 'Output as JSON', false)
    .action(async (repoPath: string, options: InspectOptions) => {
      const spinner = ora()

      try {
        const absolutePath = resolve(repoPath)
        const gitDir = resolve(absolutePath, '.git')

        if (!existsSync(absolutePath)) {
          console.error(chalk.red(`Error: Path does not exist: ${absolutePath}`))
          process.exit(1)
        }

        if (!existsSync(gitDir)) {
          console.error(chalk.red(`Error: Not a git repository: ${absolutePath}`))
          process.exit(1)
        }

        spinner.start('Analyzing repository...')

        const { GitService } = await import('@repobeats/server')
        const gitService = new GitService(absolutePath)

        const summary = await gitService.getSummary()
        const commits = await gitService.getCommits({
          since: options.since,
          until: options.until,
          maxCommits: options.maxCommits,
          includeStats: true
        })

        spinner.stop()

        if (options.json) {
          console.log(JSON.stringify({ summary, commits }, null, 2))
          return
        }

        const repoName = basename(absolutePath)

        console.log('')
        console.log(chalk.bold.cyan(`  RepoBeats Inspection: ${repoName}`))
        console.log(chalk.gray('  ─'.repeat(25)))
        console.log('')

        console.log(chalk.bold('  Repository Info'))
        console.log(`    Branch:        ${chalk.yellow(summary.branch)}`)
        console.log(`    HEAD:          ${chalk.gray(summary.head.slice(0, 7))}`)
        console.log('')

        console.log(chalk.bold('  Commit Statistics'))
        console.log(`    Total commits: ${chalk.green(commits.length)}`)

        if (commits.length > 0) {
          const earliest = Math.min(...commits.map(c => c.timestamp))
          const latest = Math.max(...commits.map(c => c.timestamp))
          const totalAdditions = commits.reduce((sum, c) => sum + (c.additions ?? 0), 0)
          const totalDeletions = commits.reduce((sum, c) => sum + (c.deletions ?? 0), 0)

          console.log(`    Date range:    ${chalk.gray(formatDate(earliest))} → ${chalk.gray(formatDate(latest))}`)
          console.log(`    Duration:      ${chalk.gray(formatDuration(latest - earliest))}`)
          console.log(`    Additions:     ${chalk.green(`+${totalAdditions}`)}`)
          console.log(`    Deletions:     ${chalk.red(`-${totalDeletions}`)}`)

          const authors = new Map<string, number>()
          for (const commit of commits) {
            const name = commit.authorName ?? 'Unknown'
            authors.set(name, (authors.get(name) ?? 0) + 1)
          }

          console.log('')
          console.log(chalk.bold('  Top Authors'))
          const sortedAuthors = [...authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
          for (const [name, count] of sortedAuthors) {
            const pct = ((count / commits.length) * 100).toFixed(1)
            console.log(`    ${chalk.blue(name)}: ${count} commits (${pct}%)`)
          }

          console.log('')
          console.log(chalk.bold('  Mapping Preview (Default Preset)'))
          console.log(`    Estimated duration: ${chalk.cyan(formatDuration(commits.length * 300))} @ 120 BPM`)
          console.log(`    Notes:              ${chalk.cyan(commits.length)}`)
        }

        console.log('')

      } catch (error) {
        spinner.fail('Inspection failed')
        if (error instanceof Error) {
          console.error(chalk.red(error.message))
        }
        process.exit(1)
      }
    })
}
