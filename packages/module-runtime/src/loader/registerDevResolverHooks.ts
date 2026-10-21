// SPDX-License-Identifier: 0BSD
import { registerHooks } from 'node:module'

import { loaderLogger } from './logger'

let installed = false

export function serverAlias(
  specifier: string,
  parentURL?: string
): string | undefined {
  if (!specifier.startsWith('@/') || !parentURL?.startsWith('file:')) return
  const parent = new URL(parentURL)
  const pieces = parent.pathname.split('/')
  const boundary = pieces.lastIndexOf('modules')
  if (boundary < 0 || pieces[boundary + 2] !== 'server') return
  const root = new URL(parent)
  root.pathname = pieces.slice(0, boundary + 3).join('/') + '/'
  root.search = ''
  root.hash = ''
  const resolved = new URL(specifier.slice(2), root)
  if (
    resolved.origin !== root.origin ||
    !resolved.pathname.startsWith(root.pathname)
  ) {
    throw new Error('Module alias escapes its server directory')
  }
  return resolved.href
}

export default function registerDevResolverHooks(): void {
  if (installed) return
  try {
    registerHooks({
      resolve(specifier, context, next) {
        return next(
          serverAlias(specifier, context.parentURL) ?? specifier,
          context
        )
      }
    })
    installed = true
  } catch (error) {
    loaderLogger.error('Unable to install the development add-on resolver', {
      error: String(error)
    })
  }
}
