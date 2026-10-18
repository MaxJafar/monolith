import { registerHooks } from 'node:module'

import { loaderLogger } from './logger'

let installed = false
export default function registerDevResolverHooks(): void {
  if (installed) return
  try {
    registerHooks({
      resolve(specifier, context, next) {
        if (
          !specifier.startsWith('@/') ||
          !context.parentURL?.startsWith('file:')
        )
          return next(specifier, context)
        const parent = new URL(context.parentURL)
        const segments = parent.pathname.split('/')
        const modules = segments.lastIndexOf('modules')
        if (modules < 0 || segments[modules + 2] !== 'server')
          return next(specifier, context)
        parent.pathname = segments.slice(0, modules + 3).join('/') + '/'
        const candidate = new URL(specifier.slice(2), parent)
        if (!candidate.pathname.startsWith(parent.pathname))
          throw new Error('Module alias escapes its server directory')
        return next(candidate.href, context)
      }
    })
    installed = true
  } catch (error) {
    loaderLogger.error(
      'Development module resolution could not be registered',
      { error: String(error) }
    )
  }
}
