// SPDX-License-Identifier: 0BSD
import { type ChildProcess, spawn } from 'node:child_process'
import { resolve } from 'node:path'

import { runProcess } from '../utils/commands'
import { ROOT_DIR } from '../utils/constants'

export const projects = {
  ui: 'packages/ui',
  client: 'apps/web',
  server: 'apps/api',
  docs: 'apps/site',
  cli: 'tools'
} as const
export function projectCommand(action: string, targets: string[] = []) {
  if (!['build', 'lint', 'typecheck'].includes(action))
    throw Error('Unsupported project action')
  for (const target of targets.length ? targets : Object.keys(projects)) {
    if (!Object.hasOwn(projects, target))
      throw Error('Unknown project ' + target)
    runProcess('pnpm', ['run', action], {
      cwd: resolve(ROOT_DIR, projects[target as keyof typeof projects]),
      stdio: 'inherit'
    })
  }
}
export async function services(
  mode: 'dev' | 'start',
  selected?: string,
  args: string[] = [],
  options: { host?: boolean; port?: string; build?: boolean } = {}
) {
  if (options.port && !/^\d{1,5}$/.test(options.port))
    throw Error('Port must be numeric')
  if (
    options.port &&
    (Number(options.port) < 1 || Number(options.port) > 65535)
  )
    throw Error('Port is outside 1–65535')
  if (mode === 'start' && options.build !== false)
    runProcess(
      'pnpm',
      [
        'exec',
        'turbo',
        'build',
        '--filter=@monolith/server',
        '--filter=@monolith/client'
      ],
      { stdio: 'inherit' }
    )
  const targets = selected ? [selected] : ['server', 'client']
  for (const target of targets)
    if (!Object.hasOwn(projects, target))
      throw Error('Unknown service ' + target)
  const children: ChildProcess[] = []
  const env = { ...process.env }
  delete env.TSX_TSCONFIG_PATH
  await new Promise<void>((finish, fail) => {
    let settled = false
    const stop = () => {
      for (const child of children) if (!child.killed) child.kill('SIGTERM')
    }
    const settle = (error?: Error) => {
      if (settled) return
      settled = true
      process.off('SIGINT', signal)
      process.off('SIGTERM', signal)
      stop()
      error ? fail(error) : finish()
    }
    const signal = () => settle()
    process.once('SIGINT', signal)
    process.once('SIGTERM', signal)
    for (const target of targets) {
      const task =
        mode === 'dev' ? 'dev' : target === 'server' ? 'start:prod' : 'preview'
      const extra = [
        ...args,
        ...(target === 'client' && options.host ? ['--host'] : []),
        ...(target === 'client' && options.port ? ['--port', options.port] : [])
      ]
      if (
        process.platform === 'win32' &&
        extra.some(value => /[&|<>^%\r\n"]/.test(value))
      ) {
        settle(Error('Invalid service argument'))
        break
      }
      const child = spawn(
        process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
        ['run', task, ...extra],
        {
          cwd: resolve(ROOT_DIR, projects[target as keyof typeof projects]),
          env,
          stdio: 'inherit',
          windowsHide: true,
          shell: process.platform === 'win32'
        }
      )
      children.push(child)
      child.once('error', settle)
      child.once('exit', code =>
        settle(code ? Error(target + ' exited with ' + code) : undefined)
      )
    }
  })
}
