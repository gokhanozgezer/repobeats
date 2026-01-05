import { Command } from 'commander'
import { resolve, basename } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import chalk from 'chalk'
import ora from 'ora'
import { DEFAULT_MAX_COMMITS, PRESETS, type PresetName } from '@repobeats/shared'

const AVAILABLE_INSTRUMENTS = ['guitar', 'piano', 'drums', 'strings'] as const
type InstrumentName = typeof AVAILABLE_INSTRUMENTS[number]

interface ExportOptions {
  format: 'midi' | 'json' | 'bundle' | 'wav'
  out?: string
  preset: PresetName
  since?: string
  until?: string
  maxCommits: number
  anonymize: boolean
  instruments?: string
}

export function createExportCommand(): Command {
  return new Command('export')
    .description('Export commits as MIDI, WAV, JSON, or bundle')
    .argument('[path]', 'Path to git repository', process.cwd())
    .option('-f, --format <type>', 'Output format: midi, wav, json, bundle', 'bundle')
    .option('-o, --out <path>', 'Output file path')
    .option('--preset <name>', 'Mapping preset: default, chill, intense, minimal, ambient', 'default')
    .option('--instruments <list>', 'Instruments for WAV: guitar,piano,drums,strings (comma-separated)', 'guitar,piano,drums,strings')
    .option('--since <rev>', 'Start commit (revision or date)')
    .option('--until <rev>', 'End commit (revision or date)')
    .option('--max-commits <number>', 'Maximum commits to process', (val) => parseInt(val, 10), DEFAULT_MAX_COMMITS)
    .option('--anonymize', 'Anonymize author names and commit messages', false)
    .action(async (repoPath: string, options: ExportOptions) => {
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

        const preset = PRESETS[options.preset as PresetName]
        if (!preset) {
          console.error(chalk.red(`Error: Unknown preset: ${options.preset}`))
          console.error(chalk.gray(`Available presets: ${Object.keys(PRESETS).join(', ')}`))
          process.exit(1)
        }

        const repoName = basename(absolutePath)
        const defaultOut = options.format === 'midi'
          ? `${repoName}.mid`
          : options.format === 'wav'
            ? `${repoName}.wav`
            : options.format === 'json'
              ? `${repoName}.json`
              : `${repoName}-repobeats.zip`

        const outPath = resolve(options.out ?? defaultOut)

        // Parse instruments for WAV export
        const instrumentSettings = {
          guitar: false,
          piano: false,
          drums: false,
          strings: false
        }
        if (options.instruments) {
          const selected = options.instruments.split(',').map(s => s.trim().toLowerCase())
          for (const inst of selected) {
            if (inst in instrumentSettings) {
              instrumentSettings[inst as InstrumentName] = true
            }
          }
        }
        // If no valid instruments selected, enable all
        if (!Object.values(instrumentSettings).some(v => v)) {
          instrumentSettings.guitar = true
          instrumentSettings.piano = true
          instrumentSettings.drums = true
          instrumentSettings.strings = true
        }

        spinner.start('Collecting commit data...')

        const { GitService } = await import('@repobeats/server')
        const gitService = new GitService(absolutePath)

        const commits = await gitService.getCommits({
          since: options.since,
          until: options.until,
          maxCommits: options.maxCommits,
          includeStats: true
        })

        spinner.succeed(`Found ${commits.length} commits`)

        if (commits.length === 0) {
          console.log(chalk.yellow('No commits found in the specified range'))
          process.exit(0)
        }

        spinner.start(`Generating ${options.format}...`)

        const { MidiService } = await import('@repobeats/server')
        const midiService = new MidiService()

        if (options.format === 'midi') {
          const result = await midiService.render(commits, preset)
          const buffer = Buffer.from(result.midiBase64, 'base64')
          writeFileSync(outPath, buffer)
          spinner.succeed(`MIDI exported to ${chalk.cyan(outPath)}`)

        } else if (options.format === 'wav') {
          const result = await midiService.render(commits, preset)
          spinner.text = 'Rendering WAV audio...'

          const { WavService } = await import('@repobeats/server')
          const wavService = new WavService()
          const wavBuffer = await wavService.render(result.notes, {
            tempo: preset.tempo.bpm,
            instruments: instrumentSettings
          })

          writeFileSync(outPath, wavBuffer)
          spinner.succeed(`WAV exported to ${chalk.cyan(outPath)}`)

          const enabledInstruments = Object.entries(instrumentSettings)
            .filter(([_, enabled]) => enabled)
            .map(([name]) => name)
          console.log(chalk.gray(`  Instruments: ${enabledInstruments.join(', ')}`))

        } else if (options.format === 'json') {
          const data = {
            commits: options.anonymize
              ? commits.map(c => ({
                  ...c,
                  authorName: `anon_${c.sha.slice(0, 8)}`,
                  authorEmail: undefined,
                  message: undefined
                }))
              : commits,
            mapping: preset
          }
          writeFileSync(outPath, JSON.stringify(data, null, 2))
          spinner.succeed(`JSON exported to ${chalk.cyan(outPath)}`)

        } else {
          const { BundleService } = await import('@repobeats/server')
          const bundleService = new BundleService()
          const bundle = await bundleService.create({
            commits,
            mapping: preset,
            repoName,
            anonymize: options.anonymize
          })
          writeFileSync(outPath, bundle)
          spinner.succeed(`Bundle exported to ${chalk.cyan(outPath)}`)
        }

        console.log('')
        console.log(chalk.green('Export complete!'))

      } catch (error) {
        spinner.fail('Export failed')
        if (error instanceof Error) {
          console.error(chalk.red(error.message))
        }
        process.exit(1)
      }
    })
}
