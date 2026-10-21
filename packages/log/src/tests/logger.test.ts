// SPDX-License-Identifier: 0BSD
import { afterEach, expect, it, vi } from 'vitest'

import { createLogger } from '../loggers/logger'
import { getConfig } from '../utils/config'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})
function capture() {
  const rows: Record<string, unknown>[] = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    const text = String(chunk).trim()
    if (text.startsWith('{')) rows.push(JSON.parse(text))
    return true
  })
  return rows
}
function logger(level: 'debug' | 'info' | 'error' = 'info') {
  return createLogger({
    name: 'monolith-test',
    pretty: false,
    file: { enabled: false },
    level
  })
}
it('writes structured metadata, a clean message and an ISO timestamp', () => {
  const rows = capture()
  logger().info('\u001b[31mSaved\u001b[0m', { count: 2 })
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    name: 'monolith-test',
    msg: 'Saved',
    count: 2,
    level: 30
  })
  expect(new Date(rows[0].time as string).toISOString()).toBe(rows[0].time)
})
it('applies level changes to subsequent calls and keeps empty messages', () => {
  const rows = capture()
  const log = logger('error')
  log.info('filtered')
  log.error('recorded')
  log.setLevel('debug')
  log.debug('')
  log.warn()
  expect(log.level).toBe('debug')
  expect(rows.map(row => row.msg)).toEqual(['recorded', ''])
})
it('retains parent bindings through nested child loggers without mutating the parent', () => {
  const rows = capture()
  const root = logger()
  const child = root.child({ task: 'import' }).child({ stage: 2 })
  child.info('ready', { rows: 12 })
  root.info('waiting')
  expect(rows[0]).toMatchObject({ task: 'import', stage: 2, rows: 12 })
  expect(rows[1]).not.toHaveProperty('task')
  expect(child.instance).not.toBe(root.instance)
})
it('serializes Error metadata through the standard Pino serializer', () => {
  const rows = capture()
  logger().error('request failed', { err: new Error('offline') })
  expect(rows[0].err).toMatchObject({ type: 'Error', message: 'offline' })
})
it('validates levels rather than accepting unsupported methods', () => {
  expect(() =>
    createLogger({ name: 'test', level: 'verbose' as never })
  ).toThrow(TypeError)
  const log = logger()
  expect(() => log.setLevel('silent' as never)).toThrow(TypeError)
  expect(log.level).toBe('info')
})
it('resolves environment options on demand and rejects invalid retention', () => {
  vi.stubEnv('LOG_LEVEL', ' WARN ')
  vi.stubEnv('LOG_DIR', ' /tmp/monolith-logs ')
  vi.stubEnv('LOG_RETENTION_DAYS', '-2')
  vi.stubEnv('NODE_ENV', 'production')
  expect(getConfig()).toEqual({
    level: 'warn',
    directory: '/tmp/monolith-logs',
    retention: 7,
    isProduction: true
  })
  vi.stubEnv('LOG_LEVEL', 'unknown')
  vi.stubEnv('LOG_RETENTION_DAYS', '14')
  expect(getConfig()).toMatchObject({ level: 'info', retention: 14 })
  vi.stubEnv('LOG_RETENTION_DAYS', '2.5')
  expect(getConfig().retention).toBe(7)
})
