import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

let roots: string[] = []
let host: string | undefined
let registered = false

/** Managed bundles resolve shared dependencies from the installed host. */
export function registerManagedResolver(
  directories: string[],
  packageFile?: string
) {
  roots = directories.map(value => value.replace(/\\/g, '/') + '/')
  host = packageFile ? pathToFileURL(packageFile).href : undefined
  if (registered || !host) return
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        host &&
        context.parentURL?.startsWith('file:') &&
        !specifier.startsWith('.') &&
        !specifier.startsWith('/') &&
        !specifier.includes(':')
      ) {
        const parent = fileURLToPath(context.parentURL).replace(/\\/g, '/')
        if (roots.some(root => parent.startsWith(root)))
          return nextResolve(specifier, { ...context, parentURL: host })
      }
      return nextResolve(specifier, context)
    }
  })
  registered = true
}
