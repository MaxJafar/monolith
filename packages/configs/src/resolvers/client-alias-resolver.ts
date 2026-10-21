// SPDX-License-Identifier: 0BSD
import fs from 'node:fs'
import path from 'node:path'

function sourceRoot(importer: string, manifest: boolean): string | undefined {
  const clean = importer.replace(/^\/@fs\//, '').split(/[?#]/)[0]!
  const absolute = path.resolve(clean).replaceAll('\\', '/')
  const parts = absolute.split('/')
  const client = parts.findIndex(
    (part, index) =>
      (part === 'client' && index > 0 && parts[index - 2] === 'modules') ||
      (part === 'web' && parts[index - 1] === 'apps')
  )
  if (client >= 0) {
    const directory = parts.slice(0, client + 1).join('/')
    return manifest ? directory : directory + '/src'
  }
  const source = parts.lastIndexOf('src')
  return source >= 0 ? parts.slice(0, source + 1).join('/') : undefined
}

export function clientAliasResolver(
  id: string,
  importer: string | undefined
): string | null {
  if (!importer || (id !== '@' && !id.startsWith('@/'))) return null
  const root = sourceRoot(
    importer,
    id === '@/manifest' || id === '@/manifest.ts'
  )
  if (!root) return null
  const target = path.resolve(root, id === '@' ? '' : id.slice(2))
  const relative = path.relative(root, target)
  if (relative === '..' || relative.startsWith('..' + path.sep)) return null
  const options = ['.tsx', '.ts', '.json'].map(extension => target + extension)
  options.push(
    path.join(target, 'index.tsx'),
    path.join(target, 'index.ts'),
    target
  )
  const found = options.find(filename => fs.existsSync(filename))
  if (found) return found.replaceAll('\\', '/')
  console.error('Cannot resolve a workspace source alias', { id, importer })
  return null
}
