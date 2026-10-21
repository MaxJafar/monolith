// SPDX-License-Identifier: 0BSD
import { describe, expect, it, vi } from 'vitest'

import { createCoreHelper } from './createCoreHelper'
import { createGetMediaHelper } from './getMediaHelper'

const native = vi.hoisted(() => ({ runtime: null as any }))
vi.mock('../../desktop/runtime', () => ({
  getNativeRuntime: () => native.runtime
}))

describe('core helper compatibility', () => {
  it('uses core paths without adding an add-on prefix', () => {
    const helper = createCoreHelper(
      'https://example.invalid/api',
      'checkModuleAvailability'
    )
    expect(helper({ id: 'monolith--achievements' }).endpoint).toBe(
      'https://example.invalid/api/modules/checkModuleAvailability?id=monolith--achievements'
    )
    expect(helper({ id: 'calendar' }).key).toEqual([
      'modules',
      'checkModuleAvailability',
      { id: 'calendar' }
    ])
  })
  it('retains the API path and encodes keys for web media requests', () => {
    native.runtime = null
    const url = new URL(
      createGetMediaHelper('https://example.invalid/api')({
        key: 'uploads/a & b.png',
        thumb: '200x0',
        download: 'true'
      })
    )
    expect(url.pathname).toBe('/api/files/get')
    expect(url.searchParams.get('key')).toBe('uploads/a & b.png')
    expect(url.searchParams.get('thumb')).toBe('200x0')
    expect(url.searchParams.get('download')).toBe('true')
  })
  it.each(['windows', 'macos'])(
    'routes %s media through the authorized native profile',
    platform => {
      native.runtime = {
        host: { platform },
        profile: { serverId: 'server', accountId: 'account' }
      }
      const url = createGetMediaHelper('https://unused.invalid')({
        key: 'secret/image.png'
      })
      expect(url).toBe(
        (platform === 'windows'
          ? 'http://monolith-media.localhost'
          : 'monolith-media://app') +
          '/server/account/files/get?key=secret%2Fimage.png'
      )
      native.runtime = null
    }
  )
})
