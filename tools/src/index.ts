#!/usr/bin/env node
// SPDX-License-Identifier: 0BSD
import { Command } from 'commander'
import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import registrations from './commands'
import { ROOT_DIR } from './utils/constants'

dotenv.config({
  path: [join(ROOT_DIR, 'env/.env.local'), join(ROOT_DIR, 'env/.env.docker')],
  quiet: true
})
const manifest = JSON.parse(
  readFileSync(join(ROOT_DIR, 'package.json'), 'utf8')
)
const cli = new Command('pnpm monolith')
cli
  .description('Monolith workspace development and package tools')
  .version(manifest.version)
  .enablePositionalOptions()
  .option('--host', 'Listen on the local network')
  .option('--port <number>', 'Web server port')
for (const register of registrations) register(cli)
cli.parseAsync(process.argv).catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
