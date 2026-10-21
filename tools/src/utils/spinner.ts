// SPDX-License-Identifier: 0BSD
import { log, spinner } from '@clack/prompts'

let depth = 0
let indicator: ReturnType<typeof spinner> | undefined
export function startSpinner(message: string) {
  depth++
  if (!process.stdout.isTTY) {
    log.step(message)
    return
  }
  if (!indicator) {
    indicator = spinner()
    indicator.start(message)
  } else indicator.message(message)
}
export function updateSpinner(message: string) {
  indicator?.message(message)
}
export function stopSpinner(message?: string) {
  depth = Math.max(0, depth - 1)
  if (depth) {
    if (message) indicator?.message(message)
    return
  }
  indicator?.stop(message)
  indicator = undefined
  if (message && !process.stdout.isTTY) log.success(message)
}
export function failSpinner(message?: string) {
  depth = 0
  indicator?.error(message)
  indicator = undefined
  if (message && !process.stdout.isTTY) log.error(message)
}
export async function withSpinner<T>(
  message: string,
  action: () => T | Promise<T>,
  labels?: { success?: string; fail?: string }
): Promise<T> {
  startSpinner(message)
  try {
    const value = await action()
    stopSpinner(labels?.success)
    return value
  } catch (error) {
    failSpinner(labels?.fail)
    throw error
  }
}
