// SPDX-License-Identifier: 0BSD
import type { RequestHandler } from 'express'
import { join } from 'node:path'

export function addonAssets(
  current: (id: string) => string | undefined,
  previous: (id: string) => string | undefined
): RequestHandler {
  return (request, response, next) => {
    const id = request.params.moduleName
    const file = request.params['0']
    if (
      !['GET', 'HEAD'].includes(request.method) ||
      typeof id !== 'string' ||
      !/^[\w-]+$/.test(id) ||
      typeof file !== 'string' ||
      !file ||
      file.includes('\0')
    )
      return next()
    const directory = current(id)
    if (!directory) return next()
    const roots = [join(directory, 'client', 'dist')]
    const backup = file.startsWith('assets/') ? previous(id) : undefined
    if (backup) roots.push(join(backup, 'client', 'dist'))
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
    if (['remoteEntry.js', 'monolith-manifest.json'].includes(file))
      headers['Cache-Control'] = 'no-store'
    const credentials = response.getHeader('Access-Control-Allow-Credentials')
    const origin = response.getHeader('Access-Control-Allow-Origin')
    response.removeHeader('Access-Control-Allow-Credentials')
    const attempt = (index: number) => {
      if (response.destroyed || response.headersSent) return
      if (index === roots.length) {
        // Restore API CORS policy when this path was not a public bundle.
        if (credentials !== undefined)
          response.setHeader('Access-Control-Allow-Credentials', credentials)
        if (origin !== undefined)
          response.setHeader('Access-Control-Allow-Origin', origin)
        else response.removeHeader('Access-Control-Allow-Origin')
        next()
        return
      }
      response.sendFile(
        file,
        { root: roots[index], dotfiles: 'deny', headers },
        error => {
          if (error && !response.headersSent && !response.destroyed)
            attempt(index + 1)
        }
      )
    }
    attempt(0)
  }
}
