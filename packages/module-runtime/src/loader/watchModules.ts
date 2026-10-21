// SPDX-License-Identifier: 0BSD
import { watch } from 'chokidar'

import { loaderLogger } from './logger'

export function watchModules(
  modulesDir: string,
  onReload: () => void | Promise<void>
): () => void {
  let closed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let dirty = false
  const drain = async () => {
    timer = undefined
    if (running || closed) return
    running = true
    try {
      do {
        dirty = false
        try {
          await onReload()
        } catch (error) {
          loaderLogger.error('Add-on reload failed', { error: String(error) })
        }
      } while (dirty && !closed && timer === undefined)
    } finally {
      running = false
    }
  }
  const schedule = () => {
    if (closed) return
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      void drain()
    }, 500)
  }
  const watcher = watch(modulesDir, {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: [
      /[\\/](?:node_modules|\.git|\.turbo|dist|dist-docker)(?:[\\/]|$)/
    ],
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  })
  for (const event of [
    'add',
    'change',
    'unlink',
    'addDir',
    'unlinkDir'
  ] as const)
    watcher.on(event, schedule)
  watcher.on('error', error =>
    loaderLogger.error('Add-on directory watcher failed', {
      error: String(error)
    })
  )
  return () => {
    if (closed) return
    closed = true
    clearTimeout(timer)
    void watcher.close().catch(error =>
      loaderLogger.error('Add-on watcher cleanup failed', {
        error: String(error)
      })
    )
  }
}
