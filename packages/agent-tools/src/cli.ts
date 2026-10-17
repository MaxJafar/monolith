#!/usr/bin/env node
import { Command, CommanderError, Option } from 'commander'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'

import { MonolithClient } from './client.js'
import { agentConfig } from './config.js'
import { readBounded } from './http.js'
import { serveMcp } from './mcp.js'
import { ProfileStore } from './profiles.js'
import { ToolService } from './tools.js'
import { MonolithError, type Policy } from './types.js'
import { version } from './version.js'

const program = new Command()
  .name('monolith-agent')
  .exitOverride()
  .configureOutput({ writeErr: () => {} })
  .description('Work with Monolith through a JSON CLI or a local MCP server')
  .version(version)
  .option(
    '--profile <name>',
    'Saved login profile',
    process.env.MONOLITH_PROFILE ?? 'default'
  )
  .option('--allow-writes', 'Enable data creation and editing', false)
  .option(
    '--allow-deletes',
    'Also enable destructive tools (requires --allow-writes)',
    false
  )

const json = (value: unknown) => {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n')
}
function context() {
  const options = program.opts()
  const policy: Policy = {
    allowWrites: options.allowWrites,
    allowDeletes: options.allowDeletes
  }
  if (policy.allowDeletes && !policy.allowWrites)
    throw new MonolithError('--allow-deletes requires --allow-writes.')
  const client = new MonolithClient(new ProfileStore(options.profile))
  return { client, policy, service: new ToolService(client, policy) }
}
function promptSecret(label: string): Promise<string> {
  if (!process.stdin.isTTY)
    throw new MonolithError(
      'Interactive sign-in needs a terminal. For automation use auth login --credentials-stdin with JSON containing email, password and optional code.'
    )
  let muted = false
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) process.stderr.write(chunk)
      done()
    }
  })
  const rl = createInterface({ input: process.stdin, output, terminal: true })
  return new Promise((resolve, reject) => {
    let answered = false
    rl.once('close', () => {
      if (!answered) reject(new MonolithError('Sign-in cancelled.'))
    })
    rl.once('SIGINT', () => {
      rl.close()
      reject(new MonolithError('Sign-in cancelled.'))
    })
    rl.question(label, answer => {
      answered = true
      rl.close()
      process.stderr.write('\n')
      resolve(answer)
    })
    muted = true
  })
}
const auth = program
  .command('auth')
  .description('Manage a revocable Monolith device session')
auth
  .command('login')
  .requiredOption('--server <origin>', 'Monolith public gateway origin')
  .option('--email <email>', 'Account email (password is prompted securely)')
  .option(
    '--credentials-stdin',
    'Read {email,password,code?} JSON from standard input'
  )
  .action(async options => {
    let email = options.email,
      password: string,
      suppliedCode: string | undefined
    if (options.credentialsStdin) {
      const input = JSON.parse(await readBounded(process.stdin, 16_384))
      email = input.email ?? email
      password = input.password
      suppliedCode = input.code
    } else password = await promptSecret('Monolith password: ')
    if (
      typeof email !== 'string' ||
      !email ||
      typeof password !== 'string' ||
      !password
    )
      throw new MonolithError('Email and password are required.')
    json(
      await context().client.login(
        options.server,
        email,
        password,
        async () => {
          const code =
            suppliedCode ?? (await promptSecret('Authenticator code: '))
          if (!/^\d{6}$/.test(code))
            throw new MonolithError('Enter a six-digit authenticator code.')
          return code
        }
      )
    )
  })
auth
  .command('status')
  .description('Verify the session without displaying credentials')
  .action(async () => {
    json(await context().client.status())
  })
auth
  .command('logout')
  .option(
    '--local-only',
    'Forget local credentials when the server is unreachable; does not revoke the session'
  )
  .action(async options => {
    json(await context().client.logout(Boolean(options.localOnly)))
  })
program
  .command('doctor')
  .description('Verify authentication and tool discovery')
  .action(async () => {
    const { client, service, policy } = context()
    const status = await client.status()
    const tools = await service.list()
    json({
      ...status,
      policy,
      toolCount: tools.length,
      tools: tools.map(tool => tool.name)
    })
  })
const toolCommands = program
  .command('tools')
  .description('Discover available actions and their JSON input schemas')
toolCommands
  .command('list')
  .option('--schemas', 'Include full tool schemas')
  .action(async options => {
    const tools = await context().service.list()
    json(
      options.schemas
        ? tools
        : tools.map(({ name, description, access }) => ({
            name,
            description,
            access
          }))
    )
  })
toolCommands.command('describe <name>').action(async name => {
  json(await context().service.get(name))
})
program
  .command('call <name>')
  .description('Call an available tool; names may omit the monolith_ prefix')
  .option('--json <json>', 'JSON arguments', '{}')
  .option(
    '--file <path>',
    'Read JSON arguments from a file; use - for standard input'
  )
  .action(async (name, options) => {
    if (options.file && options.json !== '{}')
      throw new MonolithError('Choose either --json or --file.')
    const input = options.file
      ? await readBounded(
          options.file === '-' ? process.stdin : createReadStream(options.file)
        )
      : options.json
    json({ data: await context().service.call(name, JSON.parse(input)) })
  })
program
  .command('mcp')
  .description('Serve MCP over stdin/stdout; diagnostics go to stderr')
  .action(async () => {
    await serveMcp(context().service)
  })
program
  .command('config')
  .description(
    'Print a client configuration without changing agent settings or exposing credentials'
  )
  .addOption(
    new Option('--client <client>', 'Configuration format')
      .choices(['codex', 'claude', 'openclaw', 'cursor', 'vscode', 'generic'])
      .default('generic')
  )
  .action(options => {
    const { client, policy } = context()
    process.stdout.write(
      agentConfig(options.client, client.store.profile, policy) + '\n'
    )
  })

try {
  await program.parseAsync()
} catch (error) {
  if (error instanceof CommanderError && error.exitCode === 0)
    process.exitCode = 0
  else {
    const message =
      error instanceof MonolithError || error instanceof CommanderError
        ? error.message
        : error instanceof SyntaxError
          ? 'Invalid JSON input.'
          : 'The command failed. Check the server, profile and input with doctor and tools describe.'
    process.stderr.write(
      JSON.stringify({
        error: {
          code:
            error instanceof MonolithError || error instanceof CommanderError
              ? error.code
              : 'command_failed',
          message,
          ...(error instanceof MonolithError && error.status
            ? { status: error.status }
            : {}),
          ...(error instanceof MonolithError && error.details
            ? { current: error.details }
            : {})
        }
      }) + '\n'
    )
    process.exitCode = 1
  }
}
