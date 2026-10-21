// SPDX-License-Identifier: 0BSD
import { getNativeRuntime, globalProxyRegistry } from '@monolith/api'

/** Executable add-ons are served by the connected host, never a catalog URL. */
export function resolveRemoteEntry(entry: string, apiHost?: string): string {
  if (
    !/^\/modules\/[A-Za-z0-9_-]+\/remoteEntry\.js(?:\?[A-Za-z0-9_=&.%+~-]+)?$/.test(
      entry
    )
  ) {
    throw new Error('Invalid addon entry point')
  }
  const native = getNativeRuntime()
  if (native) {
    const origin = new URL(native.profile.origin)
    if (origin.protocol !== 'https:')
      throw new Error('Downloaded desktop addons require an HTTPS host')
    return new URL('/api' + entry, origin).href
  }
  const base =
    apiHost ??
    (globalProxyRegistry.apiHost || import.meta.env.VITE_API_HOST || '')
  return base.replace(/\/+$/, '') + entry
}
