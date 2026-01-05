import { Command, InvalidArgumentError } from 'commander'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import chalk from 'chalk'
import ora from 'ora'
import getPort from 'get-port'
import open from 'open'
import { DEFAULT_HOST, DEFAULT_MAX_COMMITS, MAX_COMMITS_LIMIT } from '@repobeats/shared'
import { startServer, stopServer } from '@repobeats/server'

function parseMaxCommits(value: string): number {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new InvalidArgumentError('Must be a valid number.')
  }
  if (parsed < 1) {
    throw new InvalidArgumentError('Must be at least 1.')
  }
  if (parsed > MAX_COMMITS_LIMIT) {
    throw new InvalidArgumentError(`Must not exceed ${MAX_COMMITS_LIMIT}.`)
  }
  return parsed
}

interface UiOptions {
  port?: number
  host?: string
  open: boolean
  since?: string
  until?: string
  maxCommits?: number
  cache: boolean
  repo?: string
}

function validateRepoPath(repoPath: string): string {
  const absolutePath = resolve(repoPath)
  const gitDir = resolve(absolutePath, '.git')

  if (!existsSync(absolutePath)) {
    console.error(chalk.red(`Error: Path does not exist: ${absolutePath}`))
    process.exit(1)
  }

  if (!existsSync(gitDir)) {
    console.error(chalk.red(`Error: Not a git repository: ${absolutePath}`))
    console.error(chalk.gray('Make sure the path contains a .git directory'))
    process.exit(1)
  }

  return absolutePath
}

export function createUiCommand(): Command {
  return new Command('ui')
    .description('Start the RepoBeats UI in your browser')
    .argument('[path]', 'Path to git repository', process.cwd())
    .option('-r, --repo <path>', 'Path to git repository (alternative to argument)')
    .option('-p, --port <number>', 'Port to run the server on', (val) => parseInt(val, 10))
    .option('-h, --host <address>', 'Host address to bind to', DEFAULT_HOST)
    .option('--no-open', 'Do not open browser automatically')
    .option('--since <rev>', 'Start commit (revision or date)')
    .option('--until <rev>', 'End commit (revision or date)')
    .option('--max-commits <number>', `Maximum commits to process (max: ${MAX_COMMITS_LIMIT})`, parseMaxCommits, DEFAULT_MAX_COMMITS)
    .option('--no-cache', 'Disable caching')
    .action(async (repoPath: string, options: UiOptions) => {
      const spinner = ora()

      try {
        // --repo option takes precedence over argument
        const targetPath = options.repo ?? repoPath
        const validPath = validateRepoPath(targetPath)

        spinner.start('Finding available port...')
        const port = options.port ?? await getPort()
        spinner.succeed(`Using port ${port}`)

        spinner.start('Starting RepoBeats server...')
        await startServer({
          repoPath: validPath,
          port,
          host: options.host ?? DEFAULT_HOST,
          since: options.since,
          until: options.until,
          maxCommits: options.maxCommits ?? DEFAULT_MAX_COMMITS,
          cache: options.cache
        })

        const url = `http://${options.host ?? DEFAULT_HOST}:${port}`
        spinner.succeed(`Server running at ${chalk.cyan(url)}`)

        if (options.open) {
          spinner.start('Opening browser...')
          await open(url)
          spinner.succeed('Browser opened')
        }

        console.log('')
        console.log(chalk.gray('Press Ctrl+C to stop the server'))
        console.log('')

        const shutdown = async () => {
          console.log('')
          spinner.start('Shutting down...')
          await stopServer()
          spinner.succeed('Server stopped')
          process.exit(0)
        }

        process.on('SIGINT', shutdown)
        process.on('SIGTERM', shutdown)

      } catch (error) {
        spinner.fail('Failed to start server')
        if (error instanceof Error) {
          console.error(chalk.red(error.message))
        }
        process.exit(1)
      }
    })
}
