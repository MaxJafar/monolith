import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const scope = resolve(root, 'node_modules/.pnpm/node_modules/@blocksuite')

// 0.22.4 exports raw TypeScript while also shipping compiled JS and declarations.
// Use published declarations for tsc. Vite lowers the matching source with the
// TypeScript compiler to preserve upstream decorator/parameter-property order.
export function blocksuiteAliases() {
  return readdirSync(scope)
    .flatMap(name => {
      const dir = resolve(scope, name)
      const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'))
      if (pkg.name === '@blocksuite/icons') return []
      if (pkg.version !== '0.22.4')
        throw new Error(
          `Unsupported BlockSuite version: ${pkg.name}@${pkg.version}`
        )
      return Object.entries(pkg.exports ?? {}).flatMap(([entry, source]) => {
        if (
          typeof source !== 'string' ||
          !source.startsWith('./src/') ||
          !source.endsWith('.ts')
        )
          return []
        const file = source.replace('./src/', './dist/').replace(/\.ts$/, '.js')
        const replacement = resolve(dir, file).replaceAll('\\', '/')
        if (!existsSync(replacement))
          throw new Error(`Missing published BlockSuite build: ${replacement}`)
        return [
          {
            find: `${pkg.name}${entry === '.' ? '' : entry.slice(1)}`,
            replacement
          }
        ]
      })
    })
    .sort((a, b) => b.find.length - a.find.length)
}

if (process.argv.includes('--types')) {
  const directory = resolve(root, 'packages/ui')
  const paths = {
    '@/*': ['./src/*'],
    yjs: ['./node_modules/yjs/dist/src/index.d.ts']
  }
  for (const alias of blocksuiteAliases()) {
    const declaration = alias.replacement.replace(/\.js$/, '.d.ts')
    if (!existsSync(declaration))
      throw new Error(`Missing BlockSuite declaration: ${declaration}`)
    paths[alias.find] = [
      `./${relative(directory, declaration).replaceAll('\\', '/')}`
    ]
  }
  writeFileSync(
    resolve(directory, 'tsconfig.blocksuite.json'),
    JSON.stringify({ compilerOptions: { paths } }, null, 2) + '\n'
  )
}
