import ts from '@typescript/typescript6'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { Alias, Plugin } from 'vite'

/** Published BlockSuite 0.22.4 uses standard decorators and TS parameter
 * properties. Preserve their upstream initialization order in Vite 8/Oxc. */
export function blocksuiteSyntax(): Plugin {
  return {
    name: 'monolith-blocksuite-syntax',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]@blocksuite[\\/].*\.ts(?:$|\?)/.test(id)) return
      const result = ts.transpileModule(code, {
        fileName: id.split('?')[0],
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          useDefineForClassFields: false,
          experimentalDecorators: false,
          sourceMap: true
        }
      })
      return { code: result.outputText, map: result.sourceMapText }
    }
  }
}
export function blocksuiteRuntime(root: string): {
  aliases: Alias[]
  exclude: string[]
} {
  const scope = path.resolve(
    root,
    'node_modules/.pnpm/node_modules/@blocksuite'
  )
  const aliases: Alias[] = []
  const exclude: string[] = []
  if (!existsSync(scope)) return { aliases, exclude }
  // Pin one constructor identity even in a checkout with old virtual-store links.
  aliases.push({
    find: /^yjs$/,
    replacement: path.resolve(root, 'packages/ui/node_modules/yjs/dist/yjs.mjs')
  })
  for (const name of readdirSync(scope)) {
    const directory = path.join(scope, name)
    const pkg = JSON.parse(
      readFileSync(path.join(directory, 'package.json'), 'utf8')
    )
    if (pkg.name === '@blocksuite/icons') continue
    if (pkg.version !== '0.22.4')
      throw new Error(
        `Unsupported BlockSuite version: ${pkg.name}@${pkg.version}`
      )
    for (const [entry, source] of Object.entries(pkg.exports ?? {})) {
      if (
        typeof source !== 'string' ||
        !source.startsWith('./src/') ||
        !source.endsWith('.ts')
      )
        continue
      const find = `${pkg.name}${entry === '.' ? '' : entry.slice(1)}`
      aliases.push({
        find: new RegExp(`^${find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: path.resolve(directory, source).replaceAll('\\', '/')
      })
      exclude.push(find)
    }
  }
  return { aliases, exclude }
}
