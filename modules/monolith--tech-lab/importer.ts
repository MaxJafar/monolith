import { isAlias, isNode, parseDocument, visit } from 'yaml'

import {
  type ServiceInput,
  type TechLabImportData,
  type TechLabImportPreview,
  importDataSchema,
  importPreviewInputSchema,
  monitorKindSchema
} from './shared'

/** Independent configuration adapter: parsing never probes targets or applies changes. */
export const TECH_LAB_IMPORT_LIMITS = {
  characters: 1024 * 1024,
  nodes: 50000,
  depth: 12,
  entities: 2500,
  devices: 500,
  services: 2000
} as const

export class TechLabImportError extends Error {
  constructor(public readonly code: string) {
    super(`Unable to preview inventory: ${code}`)
    this.name = 'TechLabImportError'
  }
}

type ObjectValue = Record<string, unknown>
type WarningCode =
  'ignored' | 'invalid' | 'unsafeUrl' | 'placeholder' | 'deviceReference'
type Candidate = {
  value: ObjectValue
  name: unknown
  groups: string[]
  bookmark: boolean
}

const warningMessages: Record<WarningCode, string> = {
  ignored: 'Unsupported fields and integration credentials were omitted',
  invalid: 'Invalid or oversized optional values were omitted or shortened',
  unsafeUrl: 'Unsafe, credential-bearing or unsupported URLs were omitted',
  placeholder:
    'Unresolved configuration placeholders were omitted; configure them manually',
  deviceReference:
    'Missing or ambiguous device associations were left unassigned'
}
const deviceFields = new Set([
  'id',
  'source_key',
  'name',
  'kind',
  'host',
  'address',
  'os',
  'cpu',
  'gpu',
  'ram_gb',
  'storage',
  'location',
  'management_url',
  'glances_url',
  'notes',
  'tags'
])
const serviceFields = new Set([
  'id',
  'source_key',
  'name',
  'kind',
  'category',
  'device_id',
  'device_source_key',
  'device',
  'url',
  'href',
  'address',
  'description',
  'notes',
  'tags'
])
const nativeServiceFields = new Set([
  ...serviceFields,
  'monitor_kind',
  'monitor_target',
  'monitor_port',
  'monitor_enabled',
  'monitor_interval_seconds'
])
const placeholder = /\{\{[^}]*\}\}|\$\{[^}]*\}/
const secretParameter =
  /^(?:key|api[-_]?key|access[-_]?key|token|access[-_]?token|refresh[-_]?token|secret|password|passwd|authorization|auth)$/i
const sourceKeyPattern = /^tech-lab-v1:[a-f0-9]{64}$/

function object(value: unknown): value is ObjectValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalized(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en')
}

function guardTree(value: unknown): void {
  const pending = [{ value, depth: 0 }]

  let nodes = 0

  while (pending.length) {
    const current = pending.pop()

    if (!current) break

    if (
      ++nodes > TECH_LAB_IMPORT_LIMITS.nodes ||
      current.depth > TECH_LAB_IMPORT_LIMITS.depth
    ) {
      throw new TechLabImportError('complexity-limit')
    }

    if (Array.isArray(current.value)) {
      for (const child of current.value)
        pending.push({ value: child, depth: current.depth + 1 })
    } else if (object(current.value)) {
      for (const [key, child] of Object.entries(current.value)) {
        if (['__proto__', 'prototype', 'constructor', '<<'].includes(key)) {
          throw new TechLabImportError('unsafe-mapping')
        }
        pending.push({ value: child, depth: current.depth + 1 })
      }
    } else if (
      typeof current.value === 'number' &&
      !Number.isFinite(current.value)
    ) {
      throw new TechLabImportError('invalid-number')
    }
  }
}

function parseSource(text: string, yaml: boolean): unknown {
  if (text.length > TECH_LAB_IMPORT_LIMITS.characters)
    throw new TechLabImportError('size-limit')
  if (!text.trim()) throw new TechLabImportError('empty-input')

  try {
    if (!yaml) {
      const result: unknown = JSON.parse(text)

      guardTree(result)

      return result
    }

    const document = parseDocument(text, {
      version: '1.2',
      schema: 'core',
      merge: false,
      customTags: [],
      resolveKnownTags: false,
      uniqueKeys: true,
      stringKeys: true,
      strict: true,
      prettyErrors: false,
      logLevel: 'error'
    })

    if (document.errors.length || document.warnings.length)
      throw new TechLabImportError('invalid-yaml')
    let nodes = 0

    visit(document, (_key, node, path) => {
      if (
        ++nodes > TECH_LAB_IMPORT_LIMITS.nodes ||
        path.length > TECH_LAB_IMPORT_LIMITS.depth * 3
      ) {
        throw new TechLabImportError('complexity-limit')
      }

      if (
        isAlias(node) ||
        (isNode(node) && (node.tag || ('anchor' in node && node.anchor)))
      ) {
        throw new TechLabImportError('yaml-references-or-tags')
      }
    })
    const result: unknown = document.toJS({ maxAliasCount: 0 })

    guardTree(result)

    return result
  } catch (error) {
    if (error instanceof TechLabImportError) throw error
    // Parser diagnostics may contain source credentials. Never return them to callers.
    throw new TechLabImportError(yaml ? 'invalid-yaml' : 'invalid-json')
  }
}

async function sourceKey(parts: unknown[]): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(parts))
  )

  return `tech-lab-v1:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`
}

function homepageCandidates(source: unknown, bookmark: boolean): Candidate[] {
  if (!Array.isArray(source))
    throw new TechLabImportError('expected-homepage-groups')

  const candidates: Candidate[] = []

  function walk(items: unknown[], groups: string[]) {
    for (const item of items) {
      if (!object(item)) throw new TechLabImportError('invalid-homepage-group')

      for (const [name, value] of Object.entries(item)) {
        if (Array.isArray(value)) {
          // Bookmark details use an array; nested groups use arrays of named entries.
          if (
            bookmark &&
            value.length === 1 &&
            object(value[0]) &&
            ('href' in value[0] || 'url' in value[0])
          ) {
            candidates.push({ value: value[0], name, groups, bookmark: true })
          } else {
            walk(value, [...groups, name])
          }
        } else if (object(value) && groups.length) {
          candidates.push({ value, name, groups, bookmark })
        } else {
          throw new TechLabImportError('invalid-homepage-entry')
        }
        if (candidates.length > TECH_LAB_IMPORT_LIMITS.services)
          throw new TechLabImportError('entity-limit')
      }
    }
  }

  walk(source, [])

  return candidates
}

/** Accepted JSON: a native backup or { devices?, services?, bookmarks? }, optionally inside data. */
export async function previewTechLabImport(input: {
  format: 'homepage-services' | 'homepage-bookmarks' | 'native-json'
  text: string
}): Promise<TechLabImportPreview> {
  const validated = importPreviewInputSchema.safeParse(input)

  if (!validated.success) throw new TechLabImportError('invalid-input')

  const source = parseSource(input.text, input.format !== 'native-json')
  const warningCounts = new Map<WarningCode, number>()
  const warn = (code: WarningCode, count = 1) =>
    warningCounts.set(code, (warningCounts.get(code) ?? 0) + count)
  const ignored = (value: ObjectValue, fields: Set<string>) => {
    const count = Object.keys(value).filter(key => !fields.has(key)).length

    if (count) warn('ignored', count)
  }
  const text = (value: unknown, max: number, required = false): string => {
    if (value === undefined || value === null || value === '') return ''

    if (
      typeof value !== 'string' ||
      Array.from(value).some(character => {
        const code = character.charCodeAt(0)

        return (code < 32 && ![9, 10, 13].includes(code)) || code === 127
      })
    ) {
      warn('invalid')

      return ''
    }

    if (placeholder.test(value)) {
      warn('placeholder')

      return ''
    }

    const clean = value.normalize('NFKC').trim()

    if (clean.length > max) {
      warn('invalid')

      return required ? '' : clean.slice(0, max)
    }

    return clean
  }
  const url = (value: unknown): string => {
    const candidate = text(value, 2048, true)

    if (!candidate) return ''

    try {
      const parsed = new URL(candidate)

      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        [...parsed.searchParams.keys()].some(key =>
          secretParameter.test(key)
        ) ||
        /(?:^|[&#])(?:access_token|token|api_key|password)=/i.test(
          parsed.hash.slice(1)
        )
      ) {
        warn('unsafeUrl')

        return ''
      }

      return parsed.href
    } catch {
      warn('unsafeUrl')

      return ''
    }
  }
  const address = (value: unknown): string => {
    const candidate = text(value, 500, true)

    if (
      candidate &&
      (!/^[\p{L}\p{N}.[\]:_-]+$/u.test(candidate) || candidate.includes('://'))
    ) {
      warn('invalid')

      return ''
    }

    return candidate
  }
  const serviceAddress = (value: unknown): string => {
    const candidate = text(value, 500, true)

    if (!candidate) return ''
    if (!/^smb:/i.test(candidate)) return address(candidate)

    try {
      const parsed = new URL(candidate)

      if (
        parsed.protocol !== 'smb:' ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password ||
        candidate.includes('#') ||
        [...parsed.searchParams.keys()].some(
          key =>
            secretParameter.test(key) || /^(user|username|pass)$/i.test(key)
        )
      ) {
        warn('unsafeUrl')

        return ''
      }
      parsed.hostname = parsed.hostname.toLowerCase()

      return parsed.href
    } catch {
      warn('unsafeUrl')

      return ''
    }
  }
  const tags = (value: unknown): string[] => {
    if (value === undefined) return []

    if (!Array.isArray(value)) {
      warn('invalid')

      return []
    }

    const result = [
      ...new Set(value.map(tag => text(tag, 80, true)).filter(Boolean))
    ]

    if (result.length > 50) warn('invalid')

    return result.slice(0, 50)
  }

  let deviceValues: unknown[] = []
  let candidates: Candidate[]

  if (input.format === 'native-json') {
    if (!object(source))
      throw new TechLabImportError('expected-native-inventory')

    const inventory = object(source.data) ? source.data : source

    ignored(
      source,
      new Set([
        'data',
        'format',
        'version',
        'exported_at',
        'devices',
        'services',
        'bookmarks'
      ])
    )
    if (source.format !== undefined && source.format !== 'zillion-tech-lab')
      throw new TechLabImportError('unsupported-native-format')
    if (source.version !== undefined && source.version !== 1)
      throw new TechLabImportError('unsupported-native-version')
    if (!['devices', 'services', 'bookmarks'].some(key => key in inventory))
      throw new TechLabImportError('expected-native-inventory')

    for (const key of ['devices', 'services', 'bookmarks']) {
      if (inventory[key] !== undefined && !Array.isArray(inventory[key]))
        throw new TechLabImportError('invalid-native-collection')
    }
    deviceValues = Array.isArray(inventory.devices) ? inventory.devices : []
    candidates = []

    for (const key of ['services', 'bookmarks']) {
      const values = inventory[key]

      if (!Array.isArray(values)) continue

      for (const value of values) {
        if (!object(value)) throw new TechLabImportError('invalid-native-entry')
        candidates.push({
          value,
          name: value.name,
          groups: [],
          bookmark: key === 'bookmarks'
        })
      }
    }
  } else {
    candidates = homepageCandidates(
      source,
      input.format === 'homepage-bookmarks'
    )
  }
  if (
    deviceValues.length > TECH_LAB_IMPORT_LIMITS.devices ||
    candidates.length > TECH_LAB_IMPORT_LIMITS.services ||
    deviceValues.length + candidates.length > TECH_LAB_IMPORT_LIMITS.entities
  )
    throw new TechLabImportError('entity-limit')

  const data: TechLabImportData = { devices: [], services: [] }
  const seen = new Map<string, string>()
  const references = new Map<string, Set<string>>()

  let duplicates = 0

  for (const raw of deviceValues) {
    if (!object(raw)) throw new TechLabImportError('invalid-native-entry')
    ignored(raw, deviceFields)
    const name = text(raw.name, 160, true)

    if (!name) {
      warn('invalid')
      continue
    }

    const host = address(raw.host ?? raw.address)
    const identity = JSON.stringify([
      'device',
      normalized(name),
      normalized(host)
    ])
    const key =
      typeof raw.source_key === 'string' &&
      sourceKeyPattern.test(raw.source_key)
        ? raw.source_key
        : await sourceKey(['device', normalized(name), normalized(host)])

    for (const reference of [raw.id, raw.source_key, name]) {
      if (typeof reference !== 'string' || !reference.trim()) continue

      const lookup = normalized(reference)
      const keys = references.get(lookup) ?? new Set<string>()

      keys.add(key)
      references.set(lookup, keys)
    }

    if (seen.has(key)) {
      if (seen.get(key) !== identity)
        throw new TechLabImportError('conflicting-source-key')
      duplicates++
      continue
    }
    seen.set(key, identity)
    let ram: number | null = null

    if (raw.ram_gb !== undefined && raw.ram_gb !== null) {
      if (
        typeof raw.ram_gb === 'number' &&
        Number.isFinite(raw.ram_gb) &&
        raw.ram_gb >= 0 &&
        raw.ram_gb <= 1000000
      )
        ram = raw.ram_gb
      else warn('invalid')
    }
    data.devices.push({
      name,
      kind: text(raw.kind, 80, true) || 'server',
      host,
      os: text(raw.os, 500),
      cpu: text(raw.cpu, 500),
      gpu: text(raw.gpu, 500),
      ram_gb: ram,
      storage: text(raw.storage, 500),
      location: text(raw.location, 500),
      management_url: url(raw.management_url),
      glances_url: url(raw.glances_url),
      notes: text(raw.notes, 20000),
      tags: tags(raw.tags),
      source_key: key
    })
  }

  for (const candidate of candidates) {
    const raw = candidate.value

    ignored(
      raw,
      input.format === 'native-json' ? nativeServiceFields : serviceFields
    )
    const name = text(candidate.name, 160, true)

    if (!name) {
      warn('invalid')
      continue
    }

    const category = text(
      candidate.groups.length ? candidate.groups.join(' / ') : raw.category,
      120
    )
    const launcherValue = raw.href ?? raw.url
    const smbLauncher =
      typeof launcherValue === 'string' && /^smb:/i.test(launcherValue.trim())
    const kind = candidate.bookmark
      ? 'link'
      : raw.kind === 'game' || raw.kind === 'link'
        ? raw.kind
        : smbLauncher
          ? 'link'
          : 'service'

    if (
      raw.kind !== undefined &&
      !['service', 'game', 'link'].includes(String(raw.kind))
    )
      warn('invalid')

    const launcher = smbLauncher ? '' : url(launcherValue)
    const target = serviceAddress(
      raw.address === undefined || raw.address === null || raw.address === ''
        ? smbLauncher
          ? launcherValue
          : raw.address
        : raw.address
    )
    const reference = raw.device_source_key ?? raw.device_id ?? raw.device

    let deviceKey: string | null = null

    if (reference !== undefined && reference !== null && reference !== '') {
      const matches =
        typeof reference === 'string'
          ? references.get(normalized(reference))
          : undefined

      if (matches?.size === 1) deviceKey = matches.values().next().value ?? null
      else warn('deviceReference')
    }

    const identity = [
      'service',
      kind,
      candidate.groups.length
        ? candidate.groups.map(normalized)
        : normalized(category),
      normalized(name),
      launcher,
      /^smb:/i.test(target) ? target : normalized(target),
      deviceKey
    ]
    const key =
      typeof raw.source_key === 'string' &&
      sourceKeyPattern.test(raw.source_key)
        ? raw.source_key
        : await sourceKey(identity)

    if (seen.has(key)) {
      if (seen.get(key) !== JSON.stringify(identity))
        throw new TechLabImportError('conflicting-source-key')
      duplicates++
      continue
    }
    seen.set(key, JSON.stringify(identity))
    let monitorKind: ServiceInput['monitor_kind'] = 'none'
    let monitorTarget = ''
    let monitorPort: number | null = null
    let monitorInterval = 300

    if (input.format === 'native-json' && kind !== 'link') {
      const parsedKind = monitorKindSchema.safeParse(raw.monitor_kind ?? 'none')

      if (parsedKind.success) monitorKind = parsedKind.data
      else warn('invalid')

      if (monitorKind !== 'none') {
        monitorTarget =
          monitorKind === 'http'
            ? url(raw.monitor_target)
            : address(raw.monitor_target)

        if (
          monitorKind === 'http' &&
          monitorTarget &&
          new URL(monitorTarget).hash
        ) {
          warn('unsafeUrl')
          monitorTarget = ''
        }
      }

      if (raw.monitor_port !== undefined && raw.monitor_port !== null) {
        if (
          typeof raw.monitor_port === 'number' &&
          Number.isInteger(raw.monitor_port) &&
          raw.monitor_port >= 1 &&
          raw.monitor_port <= 65535
        )
          monitorPort = raw.monitor_port
        else warn('invalid')
      }

      if (raw.monitor_interval_seconds !== undefined) {
        if (
          typeof raw.monitor_interval_seconds === 'number' &&
          Number.isInteger(raw.monitor_interval_seconds) &&
          raw.monitor_interval_seconds >= 60 &&
          raw.monitor_interval_seconds <= 86400
        )
          monitorInterval = raw.monitor_interval_seconds
        else warn('invalid')
      }
    }
    data.services.push({
      name,
      kind,
      category,
      device_id: null,
      device_source_key: deviceKey,
      url: launcher,
      address: target,
      description: text(raw.description, 3000),
      notes: text(raw.notes, 20000),
      tags: tags(raw.tags),
      monitor_kind: monitorKind,
      monitor_target: monitorTarget,
      monitor_port: monitorPort,
      monitor_enabled: false,
      monitor_interval_seconds: monitorInterval,
      source_key: key
    })
  }

  const warnings = Array.from(
    warningCounts,
    ([code, count]) => `${warningMessages[code]} (${count}).`
  )

  if (duplicates)
    warnings.push(`Duplicate inventory entries were collapsed (${duplicates}).`)
  if (data.services.some(service => service.kind !== 'link'))
    warnings.push(
      'Imported monitoring is disabled. Review targets and enable checks manually.'
    )

  const result = importDataSchema.safeParse(data)

  if (!result.success)
    throw new TechLabImportError('invalid-normalized-inventory')

  return {
    data: result.data,
    counts: {
      devices: data.devices.length,
      services: data.services.filter(service => service.kind !== 'link').length,
      bookmarks: data.services.filter(service => service.kind === 'link')
        .length,
      duplicates
    },
    warnings
  }
}
