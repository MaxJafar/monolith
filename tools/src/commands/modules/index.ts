import type { Command } from 'commander'

import { buildModuleHandler } from './handlers/buildModuleHandler'
import { compareModuleHandler } from './handlers/compareModuleHandler'
import { createAddonHandler } from './handlers/createAddonHandler'
import { installModuleHandler } from './handlers/installModuleHandler'
import { listModulesHandler } from './handlers/listModuleHandler'
import { packAddonHandler } from './handlers/packAddonHandler'
import { publishModuleHandler } from './handlers/publishModuleHandler'
import { uninstallModuleHandler } from './handlers/uninstallModuleHandler'
import { upgradeModuleHandler } from './handlers/upgradeModuleHandler'
import { viewModuleHandler } from './handlers/viewModuleHandler'

export default function setup(program: Command): void {
  const command = program
    .command('addons')
    .alias('modules')
    .description('Create, build and share Monolith addons')

  command
    .command('create')
    .argument(
      '<author--name>',
      'Addon identity, such as yourname--reading-list'
    )
    .description('Create a customizable addon locally')
    .action(createAddonHandler)
  command
    .command('pack')
    .argument('<author--name>', 'Addon directory name')
    .description('Package addon source and build files for sharing')
    .action(packAddonHandler)

  command
    .command('list')
    .alias('ls')
    .description('List all installed addons')
    .action(listModulesHandler)

  command
    .command('install')
    .alias('i')
    .alias('add')
    .description('Install compatible addons from the configured Monolith registry')
    .argument(
      '<modules...>',
      'Addons to install, e.g., @monolith/calendar'
    )
    .option('--dev', 'Keep source code and git repository for development')
    .action(installModuleHandler)

  command
    .command('uninstall')
    .alias('un')
    .alias('rm')
    .alias('remove')
    .description('Uninstall addons')
    .argument('<modules...>', 'Addons to uninstall, e.g., achievements')
    .action(uninstallModuleHandler)

  command
    .command('upgrade')
    .alias('up')
    .alias('u')
    .description('Upgrade addons to latest version from registry')
    .argument('[module]', 'Addon to upgrade (optional, checks all if omitted)')
    .action(upgradeModuleHandler)

  command
    .command('build')
    .alias('b')
    .description('Build addon client bundles for federation')
    .argument('[module]', 'Addon to build (optional, builds all if omitted)')
    .option(
      '--docker',
      'Build for Docker (outputs to dist-docker with /api base)'
    )
    .action(buildModuleHandler)

  command
    .command('publish')
    .description('Publish a compatible addon to the registry')
    .argument('<module>', 'Addon to publish from modules/')
    .option(
      '--official',
      'Publish as official module (requires maintainer access)'
    )
    .action(publishModuleHandler)

  command
    .command('compare')
    .description('Compare local addon content with registry version')
    .argument('[module]', 'Addon to compare (optional, checks all if omitted)')
    .action(compareModuleHandler)

  command
    .command('view')
    .alias('v')
    .alias('info')
    .description('View package info from the registry')
    .argument(
      '<module>',
      'Addon to view, e.g., calendar or @monolith/calendar'
    )
    .action(viewModuleHandler)
}
