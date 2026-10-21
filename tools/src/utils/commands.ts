// SPDX-License-Identifier: 0BSD
import { type IOType, spawnSync } from 'node:child_process'

import { ROOT_DIR } from './constants'

type Options = {
  stdio?: IOType | [IOType, IOType, IOType]
  cwd?: string
  env?: Record<string, string>
  exitOnError?: boolean
}
export function commandTokens(source: string): string[] {
  const tokens: string[] = []
  let token = '',
    quote = '',
    started = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!
    if (quote) {
      if (char === quote) quote = ''
      else if (char === '\\' && quote === '"' && source[index + 1] === '"') {
        token += '"'
        index++
      } else token += char
    } else if (char === '"' || char === "'") {
      quote = char
      started = true
    } else if (/\s/.test(char)) {
      if (started) {
        tokens.push(token)
        token = ''
        started = false
      }
    } else {
      token += char
      started = true
    }
  }
  if (quote) throw Error('Unterminated command argument')
  if (started) tokens.push(token)
  if (!tokens[0]) throw Error('Invalid command')
  return tokens
}
export function runProcess(
  program: string,
  args: string[] = [],
  options: Options = {}
): string {
  const env = { ...process.env, ...options.env }
  delete env.TSX_TSCONFIG_PATH
  // pnpm's executable shim is a batch file on Windows.
  const windowsShim = process.platform === 'win32' && program === 'pnpm'
  if (windowsShim && args.some(a => /[&|<>^%\r\n"]/.test(a)))
    throw Error('Unsupported characters in pnpm argument')
  const result = spawnSync(windowsShim ? 'pnpm.cmd' : program, args, {
    cwd: options.cwd ?? ROOT_DIR,
    env,
    encoding: 'utf8',
    windowsHide: true,
    stdio: options.stdio ?? 'pipe',
    shell: windowsShim
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw Error(
      program +
        ' exited with ' +
        (result.status ?? result.signal) +
        ': ' +
        String(result.stderr ?? '').trim()
    )
  return String(result.stdout ?? '').trim()
}
export default function executeCommand(
  command: string | (() => string),
  options: Options = {},
  args: string[] = []
) {
  const [program, ...initial] = commandTokens(
    typeof command === 'function' ? command() : command
  )
  return runProcess(program!, [...initial, ...args], options)
}
export function installDeps() {
  runProcess('pnpm', ['install', '--ignore-scripts'])
}
