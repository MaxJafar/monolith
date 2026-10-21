// SPDX-License-Identifier: 0BSD
import type { Command } from 'commander'

import { runProcess } from '../utils/commands'
import { getGithubUser } from '../utils/github/user'
import createChangelogHandler from './changelog/handlers/createChangelogHandler'
import { pushSchemaFiles } from './db/functions/pushSchema'
import { collectAllSchemaFiles } from './db/functions/schema'
import { createAddonHandler } from './modules/handlers/createAddonHandler'
import { packAddonHandler } from './modules/handlers/packAddonHandler'
import {
  buildPackages,
  comparePackages,
  identity,
  installPackage,
  installed,
  publishPackage,
  removePackage,
  upgradePackages,
  validatePackage,
  viewPackage
} from './packages'
import { projectCommand, projects, services } from './services'

function register(program: Command) {
  program
    .command('whoami')
    .description('Show the GitHub account used for publishing')
    .action(() => {
      const user = getGithubUser()
      if (!user) throw Error('Sign in with gh auth login')
      console.info(user.name + ' <' + user.email + '>')
    })
  program
    .command('dev [service] [extraArgs...]')
    .description('Run development services')
    .allowUnknownOption()
    .action((name, args, cmd) =>
      services('dev', name, args, cmd.optsWithGlobals())
    )
  program
    .command('start')
    .description('Build and run the API and web preview')
    .option('--no-build', 'Use existing production bundles')
    .action((_, cmd) => services('start', undefined, [], cmd.optsWithGlobals()))
  for (const action of ['build', 'lint', 'typecheck'])
    program
      .command(action + ' [projects...]')
      .description(
        action + ' selected projects: ' + Object.keys(projects).join(', ')
      )
      .action(names => projectCommand(action, names))
  const db = program.command('db').description('Manage the database schema')
  db.command('push')
    .description('Apply compatible schema updates')
    .action(async () => {
      const result = await pushSchemaFiles(collectAllSchemaFiles())
      if (result.failures.length) throw Error(result.failures.join('\n'))
      console.info('Applied ' + result.applied + ' statements')
    })
  for (const action of ['generate', 'migrate'])
    db.command(action)
      .description(action + ' database migrations')
      .action(() => {
        runProcess('pnpm', ['--filter', '@monolith/server', 'db:' + action], {
          stdio: 'inherit'
        })
      })
  program
    .command('changelog [year] [week]')
    .description('Create weekly release notes')
    .action(createChangelogHandler)
  const addons = program
    .command('addons')
    .alias('modules')
    .description('Manage source addons')
  addons
    .command('create <id>')
    .description('Create an original addon scaffold')
    .action(createAddonHandler)
  addons
    .command('pack <id>')
    .description('Write a portable addon archive')
    .action(packAddonHandler)
  for (const [kind, command] of [
    ['modules', addons],
    ['locales', program.command('locales').description('Manage language packs')]
  ] as const) {
    command
      .command('list')
      .alias('ls')
      .description('List installed packages')
      .action(() => {
        console.table(
          installed(kind).map(row => ({
            name: row.manifest.name,
            title:
              row.manifest.displayName ??
              row.manifest.monolith?.displayName ??
              row.id,
            version: row.manifest.version
          }))
        )
      })
    command
      .command('install <names...>')
      .aliases(['i', 'add'])
      .description('Install pinned source from the configured registry')
      .option('--dev', 'Keep a development installation')
      .action(async (names, options) => {
        for (const name of names)
          await installPackage(kind, name, false, options.dev)
      })
    command
      .command('uninstall <names...>')
      .aliases(['un', 'rm', 'remove'])
      .description('Remove packages, keeping a local recovery copy')
      .action(async names => {
        for (const name of names) await removePackage(kind, name)
      })
    command
      .command('upgrade [name]')
      .aliases(['up', 'u'])
      .description('Install a newer compatible source release')
      .action(name => upgradePackages(kind, name))
    command
      .command('publish <name>')
      .description('Publish a package from its own Git repository')
      .option('--official', 'Verify registry maintainer permissions')
      .action(name => publishPackage(kind, name))
    command
      .command('validate <name>')
      .description('Validate source and translations')
      .action(name => {
        validatePackage(kind, identity(kind, name).targetDir)
        console.info('Package is valid')
      })
  }
  addons
    .command('build [name]')
    .alias('b')
    .description('Build one or all addon bundles')
    .option('--docker', 'Build with Docker API paths')
    .action(buildPackages)
  addons
    .command('compare [name]')
    .description('Compare source with its pinned release')
    .action(comparePackages)
  addons
    .command('view <name>')
    .aliases(['v', 'info'])
    .description('Read a registry entry')
    .action(viewPackage)
}
export default [register]
