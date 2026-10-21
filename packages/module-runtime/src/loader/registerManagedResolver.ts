// SPDX-License-Identifier: 0BSD
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

let config: { roots: URL[]; host?: string } = { roots: [] }
let installed = false

export function registerManagedResolver(
  directories: string[],
  packageFile?: string
) {
  config = {
    roots: directories.map(path => {
      const url = pathToFileURL(resolve(path))
      url.pathname = url.pathname.replace(/\/$/, '') + '/'
      return url
    }),
    host: packageFile ? pathToFileURL(resolve(packageFile)).href : undefined
  }
  if (installed || !config.host) return
  registerHooks({
    resolve(specifier, context, next) {
      const bare = !/^(?:[./#]|[^/]*:)/.test(specifier)
      if (bare && config.host && context.parentURL?.startsWith('file:')) {
        const parent = new URL(context.parentURL)
        if (
          config.roots.some(
            root =>
              root.host === parent.host &&
              parent.pathname.startsWith(root.pathname)
          )
        ) {
          return next(specifier, { ...context, parentURL: config.host })
        }
      }
      return next(specifier, context)
    }
  })
  installed = true
}
