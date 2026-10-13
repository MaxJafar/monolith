import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TECH_LAB_IMPORT_LIMITS,
  TechLabImportError,
  previewTechLabImport
} from './importer'
import { importDataSchema } from './shared'

const native = (value: unknown) =>
  previewTechLabImport({ format: 'native-json', text: JSON.stringify(value) })
const services = (text: string) =>
  previewTechLabImport({ format: 'homepage-services', text })
const bookmarks = (text: string) =>
  previewTechLabImport({ format: 'homepage-bookmarks', text })

afterEach(() => vi.unstubAllGlobals())

describe('Homepage inventory preview', () => {
  it('preserves group hierarchy, source order, links and visible descriptions while discarding integrations', async () => {
    const preview = await services(`
- Homelab:
    - NAS:
        href: https://NAS.local:5001
        description: Files and backups
        icon: synology.png
        widget:
          type: diskstation
          username: admin
          password: super-private-password
          url: https://private-api.local
    - Games:
        - Minecraft:
            href: https://panel.local
            address: play.local:25565
            kind: game
            widgets:
              - type: minecraft
                url: udp://play.local:25565
    - NAS:
        href: https://other-nas.local
`)

    expect(
      preview.data.services.map(service => [
        service.name,
        service.category,
        service.url
      ])
    ).toEqual([
      ['NAS', 'Homelab', 'https://nas.local:5001/'],
      ['Minecraft', 'Homelab / Games', 'https://panel.local/'],
      ['NAS', 'Homelab', 'https://other-nas.local/']
    ])
    expect(preview.data.services[0]?.description).toBe('Files and backups')
    expect(preview.data.services[1]).toMatchObject({
      kind: 'game',
      address: 'play.local:25565'
    })
    expect(preview.counts).toEqual({
      devices: 0,
      services: 3,
      bookmarks: 0,
      duplicates: 0
    })
    expect(JSON.stringify(preview)).not.toContain('super-private-password')
    expect(JSON.stringify(preview)).not.toContain('private-api')
    expect(preview.warnings.some(warning => warning.includes('omitted'))).toBe(
      true
    )
    expect(
      preview.data.services.every(
        service => !service.monitor_enabled && service.monitor_kind === 'none'
      )
    ).toBe(true)
    expect(importDataSchema.safeParse(preview.data).success).toBe(true)
  })

  it('parses the distinct bookmark details-array shape and does not invent health', async () => {
    const preview = await bookmarks(`
- Documentation:
    - GitHub:
        - abbr: GH
          href: https://github.com
          description: Source repositories
    - Tools:
        - Router:
            - href: http://192.168.1.1
              icon: mdi-router
`)

    expect(preview.counts).toEqual({
      devices: 0,
      services: 0,
      bookmarks: 2,
      duplicates: 0
    })
    expect(
      preview.data.services.map(service => [
        service.name,
        service.kind,
        service.category
      ])
    ).toEqual([
      ['GitHub', 'link', 'Documentation'],
      ['Router', 'link', 'Documentation / Tools']
    ])
    expect(
      preview.data.services.every(service => !service.monitor_enabled)
    ).toBe(true)
  })

  it('does not collide a literal group slash with a nested group path', async () => {
    const preview = await services(`
- A / B:
    - Portal: { href: https://portal.local }
- A:
    - B:
        - Portal: { href: https://portal.local }
`)

    expect(preview.data.services).toHaveLength(2)
    expect(preview.data.services[0]?.source_key).not.toBe(
      preview.data.services[1]?.source_key
    )
  })

  it('collapses repeated logical entries, while retaining distinct same-name targets', async () => {
    const preview = await services(`
- Services:
    - Portal: { href: https://PORTAL.local }
    - portal: { href: https://portal.local/, description: edited text }
    - Portal: { href: https://other.local }
`)

    expect(preview.counts.duplicates).toBe(1)
    expect(preview.data.services).toHaveLength(2)
    expect(preview.data.services[0]?.source_key).toMatch(
      /^tech-lab-v1:[a-f0-9]{64}$/
    )
  })

  it('leaves placeholders unresolved without reading an environment or file', async () => {
    const preview = await services(`
- Services:
    - Portal:
        href: '{{HOMEPAGE_VAR_PORTAL}}'
        description: '{{HOMEPAGE_FILE_SECRET}}'
        widget: { key: '{{HOMEPAGE_FILE_TOKEN}}' }
`)

    expect(preview.data.services[0]).toMatchObject({
      url: '',
      description: '',
      monitor_enabled: false
    })
    expect(JSON.stringify(preview)).not.toContain('HOMEPAGE_FILE_SECRET')
    expect(
      preview.warnings.some(warning => warning.includes('placeholders'))
    ).toBe(true)
  })

  it('does not fetch public or private imported addresses', async () => {
    const fetch = vi.fn(() => {
      throw new Error('No network allowed')
    })

    vi.stubGlobal('fetch', fetch)
    const preview = await services(
      '- LAN:\n    - Router: {href: http://192.168.1.1, address: router.lan:80}'
    )

    expect(preview.data.services[0]?.url).toBe('http://192.168.1.1/')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('Native inventory preview', () => {
  it('preserves static device information and remaps same-file device IDs', async () => {
    const id = 'a28b7b32-578f-45b3-94d4-641d7b53f700'
    const preview = await native({
      devices: [
        {
          id,
          name: 'NUC',
          host: 'nuc.local',
          kind: 'server',
          os: 'Debian 13',
          cpu: 'Intel Core i5',
          gpu: 'Intel UHD',
          ram_gb: 32,
          storage: '2 TB NVMe',
          location: 'Office',
          management_url: 'https://NUC.local:8006',
          glances_url: 'http://nuc.local:61208',
          tags: ['lab', 'lab', 'compute'],
          notes: 'Manual inventory',
          api_key: 'private-device-token'
        }
      ],
      services: [
        {
          name: 'Photos',
          device_id: id,
          url: 'https://photos.local',
          monitor_kind: 'http',
          monitor_target: 'https://photos.local',
          monitor_enabled: true
        }
      ]
    })

    expect(preview.data.devices[0]).toMatchObject({
      name: 'NUC',
      host: 'nuc.local',
      ram_gb: 32,
      os: 'Debian 13',
      cpu: 'Intel Core i5',
      gpu: 'Intel UHD',
      tags: ['lab', 'compute'],
      management_url: 'https://nuc.local:8006/',
      glances_url: 'http://nuc.local:61208/'
    })
    expect(preview.data.devices[0]).not.toHaveProperty('id')
    expect(preview.data.services[0]).toMatchObject({
      device_id: null,
      device_source_key: preview.data.devices[0]?.source_key,
      monitor_enabled: false,
      monitor_kind: 'http',
      monitor_target: 'https://photos.local/'
    })
    expect(JSON.stringify(preview)).not.toContain('private-device-token')
  })

  it('maps every duplicate device reference to the collapsed device', async () => {
    const preview = await native({
      devices: [
        { id: 'one', name: 'NAS', host: 'nas.local' },
        { id: 'two', name: 'nas', host: 'NAS.local' }
      ],
      services: [{ name: 'Files', device_id: 'two' }]
    })

    expect(preview.counts).toMatchObject({ devices: 1, duplicates: 1 })
    expect(preview.data.services[0]?.device_source_key).toBe(
      preview.data.devices[0]?.source_key
    )
  })

  it('does not guess ambiguous or foreign device associations', async () => {
    const preview = await native({
      devices: [
        { name: 'NAS', host: 'one.local' },
        { name: 'NAS', host: 'two.local' }
      ],
      services: [
        { name: 'Files', device: 'NAS' },
        { name: 'Foreign', device_id: 'foreign-id' }
      ]
    })

    expect(
      preview.data.services.map(service => service.device_source_key)
    ).toEqual([null, null])
    expect(
      preview.data.services.every(service => service.device_id === null)
    ).toBe(true)
    expect(
      preview.warnings.some(
        warning => warning.includes('associations') && warning.includes('(2)')
      )
    ).toBe(true)
  })

  it('accepts native backup metadata while dropping settings, revisions and check history', async () => {
    const source_key = `tech-lab-v1:${'a'.repeat(64)}`
    const preview = await native({
      format: 'zillion-tech-lab',
      version: 1,
      exported_at: '2026-10-13T12:00:00Z',
      devices: [],
      services: [
        {
          id: 'old-id',
          source_key,
          name: 'Game',
          kind: 'game',
          created: '2026-10-13T12:00:00Z',
          updated: '2026-10-13T12:00:00Z',
          monitor_revision: 6,
          monitor_kind: 'minecraft',
          monitor_target: 'play.local',
          monitor_port: 25565,
          monitor_interval_seconds: 900,
          monitor_enabled: true
        }
      ],
      settings: { history_retention_days: 90 },
      checks: [{ status: 'up', provider_secret: 'private-check-token' }]
    })

    expect(preview.data.services[0]).toMatchObject({
      name: 'Game',
      kind: 'game',
      source_key,
      monitor_kind: 'minecraft',
      monitor_target: 'play.local',
      monitor_port: 25565,
      monitor_interval_seconds: 900,
      monitor_enabled: false
    })
    expect(preview.data.services[0]).not.toHaveProperty('monitor_revision')
    expect(preview.data).not.toHaveProperty('settings')
    expect(JSON.stringify(preview)).not.toContain('private-check-token')
  })

  it('supports a data envelope and bookmarks with independent count totals', async () => {
    const preview = await native({
      data: {
        devices: [],
        services: [{ name: 'Panel', category: 'Lab' }],
        bookmarks: [{ name: 'Docs', href: 'https://docs.example.com' }]
      }
    })

    expect(preview.counts).toEqual({
      devices: 0,
      services: 1,
      bookmarks: 1,
      duplicates: 0
    })
  })

  it('rejects credentials and invalid numeric native monitor config while keeping monitoring disabled', async () => {
    const preview = await native({
      services: [
        {
          name: 'Portal',
          monitor_kind: 'http',
          monitor_target: 'https://user:PRIVATE_MONITOR_PASSWORD@host.local',
          monitor_enabled: true,
          monitor_port: 70000,
          monitor_interval_seconds: 0
        }
      ]
    })

    expect(preview.data.services[0]).toMatchObject({
      monitor_kind: 'http',
      monitor_target: '',
      monitor_port: null,
      monitor_interval_seconds: 300,
      monitor_enabled: false
    })
    expect(JSON.stringify(preview)).not.toContain('PRIVATE_MONITOR_PASSWORD')
  })

  it('does not inherit native monitor configuration from Homepage YAML', async () => {
    const preview = await services(
      '- Lab:\n    - Portal: {monitor_kind: http, monitor_target: https://host.local, monitor_enabled: true}'
    )

    expect(preview.data.services[0]).toMatchObject({
      monitor_kind: 'none',
      monitor_target: '',
      monitor_enabled: false
    })
  })

  it('has deterministic identity regardless of property order or editable notes', async () => {
    const first = await native({
      services: [
        { name: ' Portal ', url: 'https://PORTAL.local', notes: 'old' }
      ]
    })
    const second = await native({
      services: [{ notes: 'new', url: 'https://portal.local/', name: 'portal' }]
    })

    expect(first.data.services[0]?.source_key).toBe(
      second.data.services[0]?.source_key
    )
  })

  it('rejects conflicting preserved native source keys rather than silently dropping inventory', async () => {
    const source_key = `tech-lab-v1:${'b'.repeat(64)}`

    await expect(
      native({
        services: [
          { name: 'One', source_key },
          { name: 'Two', source_key }
        ]
      })
    ).rejects.toMatchObject({ code: 'conflicting-source-key' })
  })

  it('omits invalid optional values, skips invalid names, and validates the resulting DTO', async () => {
    const preview = await native({
      devices: [
        { name: 'NAS', ram_gb: -1, tags: ['a', '', 3], host: 'host@secret' }
      ],
      services: [
        {
          name: 'Portal',
          description: 'x'.repeat(4000),
          kind: 'unsupported',
          tags: 'invalid'
        },
        { name: '' },
        { name: 'x'.repeat(161) }
      ]
    })

    expect(preview.data.devices[0]).toMatchObject({
      ram_gb: null,
      host: '',
      tags: ['a']
    })
    expect(preview.data.services).toHaveLength(1)
    expect(preview.data.services[0]?.description).toHaveLength(3000)
    expect(preview.data.services[0]?.kind).toBe('service')
    expect(importDataSchema.safeParse(preview.data).success).toBe(true)
  })
})

describe('Import safety boundaries', () => {
  it('retains a credential-free SMB service address as copy-only inventory without a network request', async () => {
    const fetch = vi.fn(() => {
      throw new Error('No network allowed')
    })

    vi.stubGlobal('fetch', fetch)
    const preview = await native({
      services: [
        {
          name: 'Shared files',
          kind: 'link',
          url: '',
          address: 'smb://host.example.test/shared'
        }
      ]
    })

    expect(preview.data.services[0]).toMatchObject({
      kind: 'link',
      url: '',
      address: 'smb://host.example.test/shared',
      monitor_kind: 'none',
      monitor_enabled: false
    })
    expect(preview.counts.bookmarks).toBe(1)
    expect(preview.warnings).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('converts Homepage SMB service and bookmark hrefs to copy-only addresses without an HTTP launcher', async () => {
    const servicePreview = await services(
      '- Files:\n    - Shared files: {href: smb://HOST.example.test/shared}'
    )
    const bookmarkPreview = await bookmarks(
      '- Files:\n    - Shared files:\n        - href: smb://host.example.test/shared'
    )

    for (const preview of [servicePreview, bookmarkPreview]) {
      expect(preview.data.services[0]).toMatchObject({
        kind: 'link',
        url: '',
        address: 'smb://host.example.test/shared',
        monitor_kind: 'none',
        monitor_enabled: false
      })
      expect(preview.warnings).toEqual([])
    }
  })

  it.each([
    'smb://user:PRIVATE_SMB_PASSWORD@host.example.test/shared',
    'smb://PRIVATE_SMB_USER@host.example.test/shared',
    'smb://host.example.test/shared?token=PRIVATE_SMB_TOKEN',
    'smb://host.example.test/shared?auth=PRIVATE_SMB_TOKEN',
    'smb://host.example.test/shared?username=PRIVATE_SMB_USER',
    'smb://host.example.test/shared#PRIVATE_SMB_FRAGMENT',
    'smb://host.example.test/shared#',
    'smb:///shared',
    'smb:shared'
  ])(
    'omits unsafe SMB address %s without exposing its content',
    async address => {
      const preview = await native({
        services: [{ name: 'Shared files', kind: 'link', address }]
      })
      const homepage = await services(
        `- Files:\n    - Shared files: {href: '${address}'}`
      )

      for (const result of [preview, homepage]) {
        expect(result.data.services[0]).toMatchObject({
          url: '',
          address: '',
          monitor_enabled: false
        })
        expect(JSON.stringify(result)).not.toContain('PRIVATE_SMB')
        expect(result.warnings.some(warning => warning.includes('URLs'))).toBe(
          true
        )
      }
    }
  )

  it('retains distinct case-sensitive SMB share paths without expanding monitor or device-host protocols', async () => {
    const preview = await native({
      devices: [{ name: 'Host', host: 'smb://host.example.test/shared' }],
      services: [
        {
          name: 'Files',
          kind: 'link',
          address: 'smb://host.example.test/shared/Folder'
        },
        {
          name: 'Files',
          kind: 'link',
          address: 'smb://host.example.test/shared/folder'
        },
        {
          name: 'TCP',
          address: 'smb://host.example.test/shared',
          monitor_kind: 'tcp',
          monitor_target: 'smb://host.example.test/shared',
          monitor_port: 445,
          monitor_enabled: true
        }
      ]
    })

    expect(preview.counts.duplicates).toBe(0)
    expect(preview.data.services[0]?.source_key).not.toBe(
      preview.data.services[1]?.source_key
    )
    expect(preview.data.devices[0]?.host).toBe('')
    expect(preview.data.services[2]).toMatchObject({
      monitor_kind: 'tcp',
      monitor_target: '',
      monitor_enabled: false
    })
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,secret',
    'file:///etc/passwd',
    'ftp://files.local',
    'https://user:private-password@host.local/',
    'https://host.local/?api_key=private-token',
    'https://host.local/?TOKEN=private-token',
    'https://host.local/#access_token=private-token',
    '/relative/path'
  ])(
    'omits unsafe launcher %s without returning its credentials',
    async url => {
      const preview = await native({ services: [{ name: 'Portal', url }] })

      expect(preview.data.services[0]?.url).toBe('')
      expect(JSON.stringify(preview)).not.toContain('private-password')
      expect(JSON.stringify(preview)).not.toContain('private-token')
      expect(preview.warnings.some(warning => warning.includes('URLs'))).toBe(
        true
      )
    }
  )

  it('preserves ordinary query parameters and SPA fragments', async () => {
    const preview = await native({
      services: [
        { name: 'Portal', url: 'https://host.local/?page=2#/services' }
      ]
    })

    expect(preview.data.services[0]?.url).toBe(
      'https://host.local/?page=2#/services'
    )
  })

  it.each([
    '- Lab:\n    - Portal: &config { href: https://host.local }\n    - Other: *config',
    '- Lab:\n    - Portal: {href: !!str https://host.local}',
    '- Lab:\n    - Portal: {href: !custom secret}',
    '- Lab:\n    - Portal: { <<: {href: https://host.local} }',
    '- Lab:\n    - Portal: {href: https://one.local, href: https://two.local}',
    '- Lab: []\n---\n- Other: []'
  ])(
    'rejects YAML references, tags, merges, duplicate keys and multiple documents',
    async text => {
      await expect(services(text)).rejects.toBeInstanceOf(TechLabImportError)
    }
  )

  it('rejects prototype-pollution mappings without modifying Object.prototype', async () => {
    await expect(
      previewTechLabImport({
        format: 'native-json',
        text: '{"services":[],"__proto__":{"polluted":true}}'
      })
    ).rejects.toMatchObject({ code: 'unsafe-mapping' })
    expect({}).not.toHaveProperty('polluted')
  })

  it('bounds the entire input before parsing', async () => {
    await expect(
      services('x'.repeat(TECH_LAB_IMPORT_LIMITS.characters + 1))
    ).rejects.toMatchObject({ code: 'size-limit' })
  })

  it('bounds nested input even inside discarded integration configuration', async () => {
    let nested: unknown = 'private'

    for (let index = 0; index < 20; index++) nested = { nested }
    await expect(
      native({ services: [{ name: 'Portal', widget: nested }] })
    ).rejects.toMatchObject({ code: 'complexity-limit' })
  })

  it('bounds entity counts before identity hashing or duplicate collapse', async () => {
    await expect(
      native({
        devices: Array.from({ length: 501 }, () => ({ name: 'Repeated' }))
      })
    ).rejects.toMatchObject({ code: 'entity-limit' })
  })

  it('rejects nonfinite numbers and returns no source fragments in parser errors', async () => {
    await expect(
      previewTechLabImport({
        format: 'native-json',
        text: '{"services":[],"value":1e400}'
      })
    ).rejects.toMatchObject({ code: 'invalid-number' })
    await expect(
      services('- Lab:\n    - Portal: {password: PRIVATE_PARSER_SECRET')
    ).rejects.toThrow('Unable to preview inventory: invalid-yaml')
  })

  it.each([
    { devices: {} },
    { services: [null] },
    { unexpected: [] },
    { format: 'other', services: [] },
    { version: 2, devices: [] }
  ])('rejects malformed or unsupported native inventories', async value => {
    await expect(native(value)).rejects.toBeInstanceOf(TechLabImportError)
  })
})
