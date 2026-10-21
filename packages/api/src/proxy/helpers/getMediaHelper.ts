// SPDX-License-Identifier: 0BSD
import { getNativeRuntime } from '../../desktop/runtime'

type MediaRequest = { key: string; thumb?: string; download?: string }

export function createGetMediaHelper(apiHost: string | undefined) {
  return ({ key, thumb, download }: MediaRequest): string => {
    const parameters = new URLSearchParams({ key })
    if (thumb) parameters.set('thumb', thumb)
    if (download) parameters.set('download', download)
    const resource = 'files/get?' + parameters.toString()
    const desktop = getNativeRuntime()
    if (desktop) {
      const scheme =
        desktop.host.platform === 'windows'
          ? 'http://monolith-media.localhost'
          : 'monolith-media://app'
      const { serverId, accountId } = desktop.profile
      return (
        scheme +
        '/' +
        encodeURIComponent(serverId) +
        '/' +
        encodeURIComponent(accountId) +
        '/' +
        resource
      )
    }
    const origin = typeof location === 'undefined' ? '' : location.origin
    const base = apiHost?.startsWith('/') ? origin + apiHost : apiHost || origin
    return new URL(resource, base.replace(/\/+$/, '') + '/').href
  }
}
