// SPDX-License-Identifier: 0BSD
import { confirm, isCancel } from '@clack/prompts'
import { createServer } from 'node:net'
import { setTimeout as pause } from 'node:timers/promises'

import { runProcess } from './commands'

export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (value === undefined)
    throw Error('Set ' + name + ' before running this command')
  return value
}
export function getEnvVars<const T extends readonly string[]>(
  names: T,
  fallback: Record<string, string> = {}
): Record<T[number], string> {
  return Object.fromEntries(
    names.map(name => [name, getEnvVar(name, fallback[name])])
  ) as Record<T[number], string>
}
export function isDockerMode() {
  return process.env.DOCKER_MODE === 'true'
}
export async function confirmAction(message: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || isDockerMode())
    return false
  const result = await confirm({ message, initialValue: false })
  return !isCancel(result) && result
}
export function delay(ms: number) {
  return pause(ms)
}
export function isPortInUse(
  port: number,
  host = '127.0.0.1'
): Promise<boolean> {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    return Promise.reject(Error('Invalid TCP port'))
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', (error: NodeJS.ErrnoException) =>
      ['EADDRINUSE', 'EACCES'].includes(error.code ?? '')
        ? resolve(true)
        : reject(error)
    )
    probe.listen({ host, port }, () =>
      probe.close(error => (error ? reject(error) : resolve(false)))
    )
  })
}
export const checkPortInUse = isPortInUse
export async function checkAddressInUse(address: string, port: string) {
  return isPortInUse(Number(port), address)
}
export function findProcessIdsByCommandLine(query: string): string[] {
  if (!query.trim()) return []
  try {
    const output =
      process.platform === 'win32'
        ? runProcess('powershell', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress'
          ])
        : runProcess('ps', ['-axo', 'pid=,command='])
    const rows: { pid: number; command: string }[] =
      process.platform === 'win32'
        ? [JSON.parse(output)].flat().map(row => ({
            pid: row.ProcessId,
            command: row.CommandLine ?? ''
          }))
        : output.split('\n').map(row => {
            const m = row.trim().match(/^(\d+)\s+(.*)$/)
            return { pid: Number(m?.[1]), command: m?.[2] ?? '' }
          })
    return rows
      .filter(
        row =>
          row.pid > 1 &&
          row.pid !== process.pid &&
          row.pid !== process.ppid &&
          row.command.includes(query)
      )
      .map(row => String(row.pid))
  } catch {
    return []
  }
}
export function killProcessesByPids(pids: string[]) {
  for (const text of pids) {
    const id = Number(text)
    if (
      !/^\d+$/.test(text) ||
      id <= 1 ||
      id === process.pid ||
      id === process.ppid
    )
      continue
    try {
      process.kill(id, 'SIGTERM')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
}
export function killExistingProcess(target: string | number) {
  const ids =
    typeof target === 'number'
      ? [String(target)]
      : findProcessIdsByCommandLine(target)
  killProcessesByPids(ids)
  return ids.length ? Number(ids[0]) : undefined
}
export function getPortProcessInfo(port: number): string | null {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  try {
    return process.platform === 'win32'
      ? runProcess('powershell', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Get-NetTCPConnection -State Listen -LocalPort ' +
            port +
            ' | Select-Object -ExpandProperty OwningProcess'
        ])
      : runProcess('lsof', ['-nP', '-iTCP:' + port, '-sTCP:LISTEN']) || null
  } catch {
    return null
  }
}
