// SPDX-License-Identifier: 0BSD
import executeCommand, { runProcess } from '../commands'

export function run(command: string, cwd?: string) {
  return executeCommand(command, { cwd })
}
export function ghApi<T = unknown>(endpoint: string): T {
  return JSON.parse(runProcess('gh', ['api', endpoint])) as T
}
