// SPDX-License-Identifier: 0BSD
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  serializeEndpointValue,
  serializeRoutes,
  writeContractFileToClient
} from './writeContractFile'

const directories: string[] = []
const value = (output: unknown, query?: z.ZodType) => ({
  method: 'get',
  description: 'Fixture',
  noAuth: false,
  encrypted: true,
  isDownloadable: false,
  schema: { query },
  output
})
afterEach(async () => {
  vi.unstubAllEnvs()
  for (const directory of directories.splice(0)) {
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !directory.includes('monolith-contract-test-')
    )
      throw Error('Unexpected test directory')
    await rm(directory, { recursive: true, force: true })
  }
})
it('serializes date payloads and excludes error declarations', () => {
  const result = serializeEndpointValue(
    value({
      OK: z.object({ at: z.date(), until: z.date().nullable() }),
      NO_CONTENT: true,
      NOT_FOUND: true
    })
  )
  expect(Object.keys(result.output)).toEqual(['OK', 'NO_CONTENT'])
  expect(result.output.OK.properties.at).toEqual({
    type: 'string',
    format: 'date-time'
  })
  expect(result.output.OK.properties.until.anyOf).toContainEqual({
    type: 'null'
  })
  expect(result.output.NO_CONTENT).toBe(true)
  expect(serializeEndpointValue(value('custom')).output).toBe('custom')
})
it('preserves finite record fields inside intersections without mutating the original schema', () => {
  const schema = z.intersection(
    z.object({ name: z.string() }),
    z.object({ counts: z.record(z.enum(['open', 'done']), z.number()) })
  )
  const before = schema.toJSONSchema()
  const output = serializeEndpointValue(value({ OK: schema })).output.OK
  expect(output.allOf[1].properties.counts.properties).toEqual({
    open: { type: 'number' },
    done: { type: 'number' }
  })
  expect(output.allOf[1].properties.counts).not.toHaveProperty(
    'additionalProperties'
  )
  expect(schema.toJSONSchema()).toEqual(before)
})
it('walks nested routes without invoking handlers and rejects cyclic route trees', () => {
  const endpoint = {
    __isEndpointContract: true,
    getValue: () => value({ OK: z.string() })
  }
  const handler = vi.fn()
  expect(
    serializeRoutes({ first: { list: endpoint }, second: endpoint, handler })
      .first.list.method
  ).toBe('get')
  expect(handler).not.toHaveBeenCalled()
  const cycle: any = {}
  cycle.self = cycle
  expect(() => serializeRoutes(cycle)).toThrow('cycle')
})
it('writes complete contracts only when changed and skips production output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'monolith-contract-test-'))
  directories.push(directory)
  const server = join(directory, 'server')
  await mkdir(server)
  const routes = { list: { getValue: () => value({ OK: z.string() }) } }
  const output = join(directory, 'client', 'contract.ts')
  await writeContractFileToClient(routes, server)
  const before = await stat(output)
  expect(await readFile(output, 'utf8')).toContain('export default contract')
  await writeContractFileToClient(routes, server)
  expect((await stat(output)).mtimeMs).toBe(before.mtimeMs)
  expect(await readdir(join(directory, 'client'))).toEqual(['contract.ts'])
  vi.stubEnv('NODE_ENV', 'production')
  await writeContractFileToClient({ changed: routes }, server)
  expect((await stat(output)).mtimeMs).toBe(before.mtimeMs)
})
