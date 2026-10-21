// SPDX-License-Identifier: 0BSD
type Pending = () => Promise<void>
const waiting: Pending[] = []
let running = false

async function advance(): Promise<void> {
  if (running) return
  const job = waiting.shift()
  if (!job) return
  running = true
  try {
    await job()
  } finally {
    running = false
    void advance()
  }
}

export function withSessionRefreshLock<Value>(
  action: () => Promise<Value>
): Promise<Value> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  // Retain the deployed lock name so tabs running an older client still coordinate.
  if (locks) return locks.request('zillionos:session-refresh', action)
  return new Promise<Value>((resolve, reject) => {
    waiting.push(async () => {
      try {
        resolve(await action())
      } catch (error) {
        reject(error)
      }
    })
    queueMicrotask(() => {
      void advance()
    })
  })
}
