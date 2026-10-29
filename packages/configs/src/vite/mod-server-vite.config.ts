// SPDX-License-Identifier: 0BSD
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

import { serverAliasResolver } from '../resolvers/mod-server-alias-resolver'

const rootEntries = {
  index: 'index.ts',
  entity: 'entity.ts',
  schema: 'schema.drizzle.ts',
  events: 'events.ts'
}
function serverEntries(root: string): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const [name, relative] of Object.entries(rootEntries)) {
    const filename = path.join(root, relative)
    if (name === 'index' || existsSync(filename)) entries[name] = filename
  }
  const directory = path.join(root, 'schemas')
  if (existsSync(directory)) {
    for (const name of readdirSync(directory).sort()) {
      if (name.endsWith('.entity.ts'))
        entries[name.slice(0, -3)] = path.join(directory, name)
    }
  }
  return entries
}

export function defineModuleServerConfig(dirname: string) {
  const shared = [
    'server-utils',
    'drizzle',
    'blocks',
    'configs',
    'module-runtime',
    'file-storage',
    'log'
  ].map(name => '@monolith/' + name)
  return defineConfig({
    plugins: [serverAliasResolver(dirname)],
    resolve: {
      alias: [
        { find: /^@\/(.*)$/, replacement: dirname + '/$1' },
        { find: /^@$/, replacement: dirname + '/index' }
      ]
    },
    // Server images and portable addon releases bundle the same dependencies.
    // Hosts approve schema.js by hash, so its bytes must not depend on the mode.
    ssr: {
      noExternal: true,
      external: [...shared, 'drizzle-orm', 'zod', 'dayjs']
    },
    build: {
      ssr: true,
      target: 'node22',
      minify: false,
      outDir: path.join(dirname, 'dist'),
      rollupOptions: {
        input: serverEntries(dirname),
        output: {
          entryFileNames: chunk =>
            Object.hasOwn(rootEntries, chunk.name)
              ? chunk.name + '.js'
              : 'schemas/' + chunk.name + '.js',
          banner: chunk =>
            chunk.name === 'schema'
              ? ''
              : 'import { createRequire as requireForAddon } from "node:module"; globalThis.require = requireForAddon(import.meta.url);'
        }
      }
    }
  })
}
