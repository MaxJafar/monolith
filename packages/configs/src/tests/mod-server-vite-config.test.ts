import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { defineModuleServerConfig } from '../vite/mod-server-vite.config'

const directories = new Set<string>()

function fixture(files: string[]) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'zillion-module-server-')
  )
  directories.add(directory)

  for (const file of files) {
    const target = path.join(directory, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, 'export default {}\n')
  }

  return directory
}

afterEach(() => {
  for (const directory of directories)
    fs.rmSync(directory, { recursive: true, force: true })
  directories.clear()
})

describe('native module server build entries', () => {
  it('emits an optional Calendar getter at dist/events.js alongside existing schema and entity entries', () => {
    const directory = fixture([
      'index.ts',
      'schema.drizzle.ts',
      'events.ts',
      'entity.ts',
      'schemas/example.entity.ts'
    ])
    const config = defineModuleServerConfig(directory)
    expect(config.build?.rollupOptions?.input).toEqual({
      index: path.join(directory, 'index.ts'),
      schema: path.join(directory, 'schema.drizzle.ts'),
      events: path.join(directory, 'events.ts'),
      entity: path.join(directory, 'entity.ts'),
      'example.entity': path.join(directory, 'schemas/example.entity.ts')
    })
    expect(config.build?.outDir).toBe(path.join(directory, 'dist'))
    const output = config.build?.rollupOptions?.output

    if (!output || Array.isArray(output))
      throw new Error('Expected one server output configuration')

    const fileName = output.entryFileNames as (chunk: {
      name: string
    }) => string
    expect(fileName({ name: 'events' })).toBe('events.js')
    expect(fileName({ name: 'index' })).toBe('index.js')
    expect(fileName({ name: 'schema' })).toBe('schema.js')
    expect(fileName({ name: 'entity' })).toBe('entity.js')
    expect(fileName({ name: 'example.entity' })).toBe(
      'schemas/example.entity.js'
    )
  })
  it('does not introduce a missing entry for modules without an events getter', () => {
    const directory = fixture(['index.ts'])
    expect(
      defineModuleServerConfig(directory).build?.rollupOptions?.input
    ).toEqual({ index: path.join(directory, 'index.ts') })
  })
})
