import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { build } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  vi.unstubAllEnvs()
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

describe('module server build modes', () => {
  // Hosts approve addon tables by the hash of schema.js, so a server image and
  // the portable release must emit the same bytes, even with CommonJS bundled.
  it('emits the same schema.js for server images and portable releases', async () => {
    const root = fixture([])
    const files = {
      'pnpm-workspace.yaml': 'packages: []\n',
      'apps/api/package.json': '{}\n',
      'node_modules/cjs-helper/package.json': JSON.stringify({
        name: 'cjs-helper',
        main: 'index.js'
      }),
      'node_modules/cjs-helper/index.js':
        'exports.label = name => name.toUpperCase()\n',
      'modules/demo/server/schema.drizzle.ts':
        "import { createModuleTable } from '@monolith/drizzle'\n\nexport const items = createModuleTable('demo')('items', {})\n",
      'modules/demo/server/index.ts':
        "import { label } from 'cjs-helper'\n\nimport * as schema from './schema.drizzle'\n\nexport default { label, schema }\n"
    }

    for (const [file, contents] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, contents)
    }
    vi.stubEnv('ROOT_DIR', root)
    const server = path.join(root, 'modules/demo/server')

    async function schemaFor(release: string) {
      vi.stubEnv('MONOLITH_ADDON_RELEASE', release)
      await build({
        ...defineModuleServerConfig(server),
        root: server,
        configFile: false,
        logLevel: 'silent'
      })

      return fs.readFileSync(path.join(server, 'dist/schema.js'), 'utf8')
    }

    const image = await schemaFor('')
    expect(await schemaFor('1')).toBe(image)
  })
})
