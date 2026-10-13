import dotenv from 'dotenv'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import postgres from 'postgres'

import { ROOT_DIR } from '../utils/constants'

const isWindows = process.platform === 'win32'
const existingWindowsRuntime = path.join(
  ROOT_DIR,
  '.temp',
  'monolith-review-postgres'
)
const runtime = path.join(
  ROOT_DIR,
  '.temp',
  isWindows
    ? fs.existsSync(path.join(existingWindowsRuntime, 'data', 'PG_VERSION'))
      ? 'monolith-review-postgres'
      : 'lifeforge-postgres-windows'
    : 'zillion-postgres'
)
const data = path.join(runtime, 'data')
const envFile = path.join(ROOT_DIR, 'env', '.env.local')
const binaries =
  process.env.POSTGRES_BIN ||
  (isWindows
    ? path.join(ROOT_DIR, '.temp', 'search-verification', 'pgsql', 'bin')
    : '/opt/homebrew/opt/postgresql@17/bin')
const port = 55432

function run(binary: string, args: string[]) {
  const result = spawnSync(
    path.join(binaries, isWindows ? `${binary}.exe` : binary),
    args,
    {
      encoding: 'utf8',
      windowsHide: true
    }
  )

  if (result.status !== 0)
    throw new Error(
      `${binary}: ${result.stderr || result.stdout || result.error?.message}`
    )
}

async function main() {
  if (!fs.existsSync(path.join(binaries, isWindows ? 'pg_ctl.exe' : 'pg_ctl')))
    throw new Error(
      'PostgreSQL binaries unavailable. Set POSTGRES_BIN to your existing PostgreSQL bin directory.'
    )
  fs.mkdirSync(runtime, { recursive: true })

  if (process.argv[2] === 'stop') {
    if (fs.existsSync(path.join(data, 'postmaster.pid')))
      run('pg_ctl', ['-D', data, '-m', 'fast', 'stop'])
    console.log('Monolith isolated database stopped; data retained.')

    return
  }

  if (!fs.existsSync(envFile)) {
    const appPassword = crypto.randomBytes(32).toString('hex')
    const adminPassword = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(
      envFile,
      [
        `DATABASE_URL=postgres://zillion_app:${appPassword}@127.0.0.1:${port}/zillion_dev`,
        `DATABASE_ADMIN_URL=postgres://zillion_admin:${adminPassword}@127.0.0.1:${port}/zillion_dev`,
        `JWT_SIGNING_KEY=${crypto.randomBytes(64).toString('hex')}`,
        `MASTER_KEY=${crypto.randomBytes(32).toString('hex')}`,
        'VITE_API_HOST=http://localhost:3636',
        'CORS_ALLOWED_ORIGINS=http://localhost:5173',
        'PORT=3636',
        ''
      ].join('\n'),
      { mode: 0o600 }
    )
  }
  dotenv.config({ path: envFile, quiet: true })
  const admin = new URL(process.env.DATABASE_ADMIN_URL || '')
  const app = new URL(process.env.DATABASE_URL || '')

  if (
    admin.hostname !== '127.0.0.1' ||
    admin.port !== String(port) ||
    admin.pathname !== '/zillion_dev' ||
    app.hostname !== '127.0.0.1' ||
    app.port !== String(port) ||
    app.pathname !== '/zillion_dev' ||
    admin.username !== 'zillion_admin' ||
    app.username !== 'zillion_app'
  ) {
    throw new Error(
      'local:setup only manages the isolated loopback database zillion_dev on port 55432. Existing environment was preserved.'
    )
  }

  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    const passwordFile = path.join(
      isWindows ? path.join(os.homedir(), '.lifeforge-ai') : runtime,
      `init-password-${crypto.randomUUID()}`
    )
    fs.mkdirSync(path.dirname(passwordFile), { recursive: true })
    fs.writeFileSync(passwordFile, decodeURIComponent(admin.password), {
      mode: 0o600
    })

    try {
      run('initdb', [
        '-D',
        data,
        '-U',
        'zillion_admin',
        isWindows ? '--auth-local=scram-sha-256' : '--auth-local=trust',
        '--auth-host=scram-sha-256',
        ...(isWindows ? ['--encoding=UTF8', '--locale=C'] : []),
        '--pwfile',
        passwordFile
      ])
    } finally {
      fs.unlinkSync(passwordFile)
    }
  }

  if (!fs.existsSync(path.join(data, 'postmaster.pid'))) {
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      path.join(runtime, 'postgres.log'),
      '-o',
      isWindows
        ? `-h 127.0.0.1 -p ${port}`
        : `-h 127.0.0.1 -p ${port} -k ${runtime}`,
      '-w',
      'start'
    ])
  }

  const management = postgres(new URL('/postgres', admin).href, {
    max: 1,
    onnotice: () => {}
  })

  try {
    const roles =
      await management`select 1 from pg_roles where rolname = 'zillion_app'`

    if (!roles.length)
      await management.unsafe(
        `create role zillion_app login nosuperuser nobypassrls password '${decodeURIComponent(app.password).replaceAll("'", "''")}'`
      )

    const databases =
      await management`select 1 from pg_database where datname = 'zillion_dev'`

    if (!databases.length)
      await management.unsafe('create database zillion_dev owner zillion_admin')
    await management.unsafe("alter database zillion_dev set timezone to 'UTC'")
  } finally {
    await management.end()
  }

  const sql = postgres(admin.href, { max: 1, onnotice: () => {} })

  try {
    await sql.unsafe('grant usage on schema public to zillion_app')
    await sql.unsafe(
      'grant select, insert, update, delete on all tables in schema public to zillion_app'
    )
    await sql.unsafe(
      'grant usage, select on all sequences in schema public to zillion_app'
    )
    await sql.unsafe(
      'alter default privileges for role zillion_admin in schema public grant select, insert, update, delete on tables to zillion_app'
    )
    await sql.unsafe(
      'alter default privileges for role zillion_admin in schema public grant usage, select on sequences to zillion_app'
    )
  } finally {
    await sql.end()
  }
  console.log(
    'Monolith isolated PostgreSQL ready on 127.0.0.1:55432. Run pnpm db:push, then pnpm dev. Environment secrets remain in ignored env/.env.local.'
  )
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
