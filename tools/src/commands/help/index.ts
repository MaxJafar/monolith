import { log } from '@clack/prompts'
import chalk from 'chalk'
import type { Command } from 'commander'

const LOGO = chalk.bold('\n▌ monolith\n')

function formatSectionTitle(title: string): string {
  return `\n${chalk.bold(title)}\n`
}

function formatCommand(name: string, description: string): string {
  const paddedName = name.padEnd(20)

  return `   ${chalk.bold(paddedName)} ${chalk.dim('│')} ${chalk.reset(description)}`
}

function formatOption(flags: string, description: string): string {
  const paddedFlags = flags.padEnd(25)

  return `   ${chalk.reset(paddedFlags)} ${chalk.dim('│')} ${chalk.reset(description)}`
}

function formatArgument(name: string, description: string): string {
  const paddedName = name.padEnd(20)

  return `   ${chalk.bold(paddedName)} ${chalk.dim('│')} ${chalk.reset(description)}`
}

export default function setup(program: Command): void {
  program.configureHelp({
    formatHelp: (cmd, helper) => {
      const output: string[] = []

      // Show logo only for root command
      if (!cmd.parent) {
        output.push(LOGO)
      } else {
        output.push('')
        output.push(
          `   ${chalk.bold('monolith')} ${chalk.bold(cmd.name())} ${chalk.dim('- ' + cmd.description())}`
        )
        output.push('')
      }

      // Usage
      output.push(formatSectionTitle('Usage'))

      const usage = helper
        .commandUsage(cmd)
        .replace(/\bmonolith\b/, chalk.bold('monolith'))
        .replace(/\[options\]/g, chalk.reset('[options]'))
        .replace(/\[command\]/g, chalk.bold('[command]'))

      output.push(`   ${chalk.dim('$')} ${usage}`)

      // Description for subcommands
      if (cmd.parent && cmd.description()) {
        output.push(formatSectionTitle('Description'))
        output.push(`   ${chalk.reset(cmd.description())}`)
      }

      // Arguments
      const args = helper.visibleArguments(cmd)

      if (args.length > 0) {
        output.push(formatSectionTitle('Arguments'))

        for (const arg of args) {
          const argName = arg.required ? `<${arg.name()}>` : `[${arg.name()}]`

          output.push(formatArgument(argName, arg.description || ''))
        }
      }

      // Options
      const options = helper.visibleOptions(cmd)

      if (options.length > 0) {
        output.push(formatSectionTitle('Options'))

        for (const opt of options) {
          output.push(formatOption(opt.flags, opt.description))
        }
      }

      // Commands
      const commands = helper.visibleCommands(cmd)

      if (commands.length > 0) {
        output.push(formatSectionTitle('Commands'))

        for (const subCmd of commands) {
          output.push(formatCommand(subCmd.name(), subCmd.description()))
        }
      }

      // Footer
      output.push('')
      output.push(
        chalk.dim(
          `   Run ${chalk.bold('pnpm monolith <command> --help')} for more info on a specific command`
        )
      )
      output.push('')

      return output.join('\n')
    },

    subcommandTerm: cmd => chalk.bold(cmd.name()),
    argumentTerm: arg =>
      chalk.bold(arg.required ? `<${arg.name()}>` : `[${arg.name()}]`),
    optionTerm: opt => chalk.reset(opt.flags)
  })

  // Custom error formatting
  program.configureOutput({
    outputError: str => {
      log.error(str.trim())
    }
  })
}
