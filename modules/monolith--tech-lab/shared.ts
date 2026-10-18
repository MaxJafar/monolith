import z from 'zod'

export const instantSchema = z.string().datetime({ offset: true })

const name = z.string().trim().min(1).max(160)
const short = z.string().trim().max(500).default('')
const notes = z.string().max(20000).default('')
const tags = z.array(z.string().trim().min(1).max(80)).max(50).default([])

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(value => {
    if (!value) return true

    try {
      const url = new URL(value)

      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        ![...url.searchParams.keys()].some(
          key =>
            /token|password|secret|api[_-]?key|authorization/i.test(key) ||
            /^(key|access[_-]?key|auth|passwd)$/i.test(key)
        )
      )
    } catch {
      return false
    }
  }, 'Use an HTTP or HTTPS URL without embedded credentials or credential query parameters')
  .default('')

const sourceKey = z.string().trim().min(1).max(200).nullable().default(null)

export const deviceInputSchema = z
  .object({
    name,
    kind: z.string().trim().min(1).max(80).default('server'),
    host: short,
    os: short,
    cpu: short,
    gpu: short,
    ram_gb: z.number().finite().min(0).max(1000000).nullable().default(null),
    storage: short,
    location: short,
    management_url: httpUrlSchema,
    glances_url: httpUrlSchema,
    notes,
    tags,
    source_key: sourceKey
  })
  .strict()

export const serviceKindSchema = z.enum(['service', 'game', 'link'])

export const monitorKindSchema = z.enum(['none', 'http', 'tcp', 'minecraft'])

export const serviceInputSchema = z
  .object({
    name,
    kind: serviceKindSchema.default('service'),
    category: z.string().trim().max(120).default(''),
    device_id: z.string().uuid().nullable().default(null),
    url: httpUrlSchema,
    address: short,
    description: z.string().max(3000).default(''),
    notes,
    tags,
    monitor_kind: monitorKindSchema.default('none'),
    monitor_target: z
      .string()
      .trim()
      .max(2048)
      .refine(
        value =>
          value.includes('://')
            ? httpUrlSchema.safeParse(value).success
            : !value.includes('@'),
        'Monitor targets must not contain embedded credentials or credential query parameters'
      )
      .default(''),
    monitor_port: z.number().int().min(1).max(65535).nullable().default(null),
    monitor_enabled: z.boolean().default(false),
    monitor_interval_seconds: z.number().int().min(60).max(86400).default(300),
    source_key: sourceKey
  })
  .strict()

const identity = {
  id: z.string().uuid(),
  created: instantSchema,
  updated: instantSchema
}

export const deviceSchema = deviceInputSchema.extend(identity)

export const serviceSchema = serviceInputSchema.extend({
  ...identity,
  monitor_revision: z.number().int().positive()
})

export const deviceSaveSchema = deviceInputSchema.extend({
  id: z.string().uuid().optional(),
  expected_updated: instantSchema.optional()
})

export const serviceSaveSchema = serviceInputSchema.extend({
  id: z.string().uuid().optional(),
  expected_updated: instantSchema.optional()
})

export const deleteInputSchema = z
  .object({ id: z.string().uuid(), expected_updated: instantSchema })
  .strict()

export const probeDetailsSchema = z
  .object({
    players_online: z.number().int().min(0).optional(),
    players_max: z.number().int().min(0).optional(),
    version: z.string().max(500).optional()
  })
  .strict()

export const probeResultSchema = z
  .object({
    status: z.enum(['up', 'down', 'error']),
    latency_ms: z.number().finite().min(0).nullable(),
    http_status: z.number().int().min(100).max(599).nullable(),
    message: z.string().max(2000),
    details: probeDetailsSchema.optional()
  })
  .strict()

export const checkSchema = probeResultSchema.extend({
  id: z.string().uuid(),
  service_id: z.string().uuid().nullable(),
  original_service_id: z.string().uuid(),
  service_name: name,
  monitor_kind: monitorKindSchema,
  monitor_target: z.string(),
  monitor_port: z.number().int().nullable(),
  monitor_revision: z.number().int().positive(),
  checked_at: instantSchema
})

export const settingsInputSchema = z
  .object({
    auto_refresh_seconds: z.number().int().min(15).max(300).default(30),
    stale_after_multiplier: z.number().int().min(2).max(10).default(3),
    history_retention_days: z.number().int().min(7).max(90).default(30)
  })
  .strict()

export const settingsSchema = settingsInputSchema.extend({
  updated: instantSchema
})

export const settingsSaveSchema = settingsInputSchema.extend({
  expected_updated: instantSchema.optional()
})

export const serviceHealthSchema = z.object({
  service_id: z.string().uuid(),
  status: z.enum(['unknown', 'disabled', 'stale', 'up', 'down', 'error']),
  latest: checkSchema.nullable(),
  observed_24h: z.object({
    up: z.number().int().min(0),
    down: z.number().int().min(0),
    error: z.number().int().min(0),
    total: z.number().int().min(0),
    up_percent: z.number().min(0).max(100).nullable()
  }),
  next_check_at: instantSchema.nullable()
})

export const snapshotSchema = z.object({
  devices: z.array(deviceSchema),
  services: z.array(serviceSchema),
  health: z.array(serviceHealthSchema),
  settings: settingsSchema,
  checked_at: instantSchema
})

export const deviceTelemetrySchema = z.object({
  status: z.enum(['up', 'error', 'disabled']),
  message: z.string().max(2000),
  captured_at: instantSchema,
  cpu_percent: z.number().finite().min(0).max(100).nullable(),
  ram_used_bytes: z.number().finite().min(0).nullable(),
  ram_total_bytes: z.number().finite().min(0).nullable(),
  uptime_seconds: z.number().finite().min(0).nullable(),
  filesystems: z.array(
    z.object({
      name: z.string(),
      used_bytes: z.number().finite().min(0),
      total_bytes: z.number().finite().min(0)
    })
  )
})

export const importDataSchema = z
  .object({
    devices: z
      .array(deviceInputSchema.extend({ id: z.string().uuid().optional() }))
      .max(500),
    services: z
      .array(
        serviceInputSchema.extend({
          device_source_key: z.string().max(200).nullable().optional()
        })
      )
      .max(2000)
  })
  .strict()

export const importPreviewInputSchema = z
  .object({
    format: z.enum(['homepage-services', 'homepage-bookmarks', 'native-json']),
    text: z.string().max(5000000)
  })
  .strict()

export const importPreviewSchema = z.object({
  data: importDataSchema,
  counts: z.object({
    devices: z.number().int(),
    services: z.number().int(),
    bookmarks: z.number().int(),
    duplicates: z.number().int()
  }),
  warnings: z.array(z.string())
})

export const importSummarySchema = z.object({
  created: z.object({ devices: z.number().int(), services: z.number().int() }),
  skipped: z.object({ devices: z.number().int(), services: z.number().int() }),
  warnings: z.array(z.string())
})

export const backupSchema = z.object({
  format: z.literal('zillion-tech-lab'),
  version: z.literal(1),
  exported_at: instantSchema,
  devices: z.array(deviceSchema),
  services: z.array(serviceSchema),
  settings: settingsSchema
})

export const historySchema = z.object({
  checks: z.array(checkSchema),
  truncated: z.boolean(),
  hours: z.number().int(),
  service: serviceSchema
})

export const runChecksSchema = z.object({
  checks: z.array(checkSchema),
  skipped: z.number().int().min(0)
})

export type DeviceInput = z.infer<typeof deviceInputSchema>

export type Device = z.infer<typeof deviceSchema>

export type ServiceInput = z.infer<typeof serviceInputSchema>

export type Service = z.infer<typeof serviceSchema>

export type ProbeResult = z.infer<typeof probeResultSchema>

export type Check = z.infer<typeof checkSchema>

export type SettingsInput = z.infer<typeof settingsInputSchema>

export type Settings = z.infer<typeof settingsSchema>

export type ServiceHealth = z.infer<typeof serviceHealthSchema>

export type TechLabSnapshot = z.infer<typeof snapshotSchema>

export type DeviceTelemetry = z.infer<typeof deviceTelemetrySchema>

export type TechLabImportData = z.infer<typeof importDataSchema>

export type TechLabImportPreview = z.infer<typeof importPreviewSchema>

export type TechLabImportSummary = z.infer<typeof importSummarySchema>

export type TechLabBackup = z.infer<typeof backupSchema>
