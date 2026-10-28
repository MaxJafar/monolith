import { describe, expect, it } from 'vitest'

import { deviceIcon, serviceIcon } from './icons'

describe('Tech Lab icons', () => {
  it('uses brand marks for recognised services and kind fallbacks otherwise', () => {
    expect(
      serviceIcon({ name: 'Jellyfin · Медиатека', url: '', kind: 'service' })
    ).toBe('simple-icons:jellyfin')
    expect(
      serviceIcon({
        name: 'Flows',
        url: 'https://host.invalid:8450',
        kind: 'service'
      })
    ).toBe('lucide:server')
    expect(
      serviceIcon({ name: 'Minecraft Server', url: '', kind: 'game' })
    ).toBe('simple-icons:minecraft')
    expect(serviceIcon({ name: 'Arcade', url: '', kind: 'game' })).toBe(
      'lucide:gamepad-2'
    )
    expect(serviceIcon({ name: 'Shared Files', url: '', kind: 'link' })).toBe(
      'lucide:folder-open'
    )
    expect(
      serviceIcon({ name: 'Pingvin Share', url: '', kind: 'service' })
    ).toBe('lucide:share-2')
  })

  it('picks an operating system mark for each machine', () => {
    expect(
      deviceIcon({ os: 'Windows 11', kind: 'desktop', name: 'PC RTX 5060' })
    ).toBe('mdi:microsoft-windows')
    expect(deviceIcon({ os: 'macOS', kind: 'desktop', name: 'Mac mini' })).toBe(
      'simple-icons:apple'
    )
    expect(
      deviceIcon({ os: 'Alpine Linux', kind: 'server', name: 'Dell OptiPlex' })
    ).toBe('simple-icons:alpinelinux')
    expect(deviceIcon({ os: '', kind: 'laptop', name: 'Spare' })).toBe(
      'lucide:laptop'
    )
  })
})
