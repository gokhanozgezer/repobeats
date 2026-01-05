import { Command } from 'commander'
import chalk from 'chalk'
import { APP_VERSION } from '@repobeats/shared'
import { createUiCommand } from './commands/ui.js'
import { createExportCommand } from './commands/export.js'
import { createInspectCommand } from './commands/inspect.js'

const program = new Command()

program
  .name('repobeats')
  .description('Transform your git commits into music')
  .version(APP_VERSION, '-v, --version')

program.addCommand(createUiCommand())
program.addCommand(createExportCommand())
program.addCommand(createInspectCommand())

program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`))
  console.log('')
  program.outputHelp()
  process.exit(1)
})

program.parse()
