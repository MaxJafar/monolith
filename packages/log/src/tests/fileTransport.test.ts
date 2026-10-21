// SPDX-License-Identifier: 0BSD
import { once } from 'node:events'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { closeFileStream, getFileStream } from '../utils/fileTransport'

const directories: string[] = []
function directory() {
  const created = mkdtempSync(join(tmpdir(), 'monolith-log-test-'))
  directories.push(created)
  return created
}
afterEach(() => {
  closeFileStream()
  for (const path of directories.splice(0)) {
    const target = resolve(path)
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !target.includes('monolith-log-test-')
    )
      throw Error('Unexpected test directory')
    rmSync(target, { recursive: true, force: true })
  }
})
it('shares an active destination and flushes output when closing the pool', async () => {
  const path = directory()
  const stream = getFileStream({ directory: path })
  expect(getFileStream({ directory: join(path, '.') })).toBe(stream)
  stream.write('{"message":"preserved"}\n')
  const finished = once(stream, 'finish')
  closeFileStream()
  await finished
  expect(readFileSync(join(path, 'monolith.log'), 'utf8')).toBe(
    '{"message":"preserved"}\n'
  )
})
it('reopens an ended stream instead of writing into an unusable destination', async () => {
  const path = directory()
  const first = getFileStream({ directory: path })
  const finished = once(first, 'finish')
  first.end('first\n')
  await finished
  const second = getFileStream({ directory: path })
  expect(second).not.toBe(first)
  const next = once(second, 'finish')
  second.end('second\n')
  await next
  expect(readFileSync(join(path, 'monolith.log'), 'utf8')).toBe(
    'first\nsecond\n'
  )
})
