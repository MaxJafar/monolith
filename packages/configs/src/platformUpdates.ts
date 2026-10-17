import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  channel: z.enum(['stable', 'beta']),
  autoDownload: z.boolean(),
  autoInstall: z.boolean(),
  installHourUTC: z.number().int().min(0).max(23)
})

export const platformUpdateSchema = z.object({
  configured: z.boolean(),
  target: z.string(),
  currentVersion: z.string(),
  phase: z.enum([
    'idle',
    'checking',
    'available',
    'downloading',
    'ready',
    'verifying',
    'installing',
    'restarting',
    'rollingBack',
    'rolledBack',
    'complete',
    'failed'
  ]),
  release: z
    .object({
      format: z.literal(1),
      version: z.string(),
      channel: z.enum(['stable', 'beta']),
      protocol: z.number(),
      schemaHash: z.string(),
      notes: z.string(),
      artifacts: z.array(
        z.object({
          target: z.string(),
          url: z.string(),
          sha256: z.string(),
          bytes: z.number(),
          format: z.enum(['zip', 'docker-archive']),
          imageId: z.string().optional(),
          parts: z
            .array(
              z.object({
                url: z.string(),
                sha256: z.string(),
                bytes: z.number()
              })
            )
            .optional()
        })
      )
    })
    .nullable(),
  received: z.number(),
  total: z.number(),
  error: z.string(),
  blocked: z.string(),
  checkedAt: z.string(),
  preferences: updatePreferencesSchema,
  previousVersion: z.string(),
  failedVersion: z.string(),
  canRollback: z.boolean(),
  noticeId: z.string()
})

export type PlatformUpdateStatus = z.infer<typeof platformUpdateSchema>

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>

export type UpdateAction =
  | 'status'
  | 'check'
  | 'download'
  | 'install'
  | 'rollback'
  | 'settings'
  | 'ready'

export function emptyUpdateStatus(
  version = '',
  target = 'server'
): PlatformUpdateStatus {
  return {
    configured: false,
    target,
    currentVersion: version,
    phase: 'idle',
    release: null,
    received: 0,
    total: 0,
    error: '',
    blocked: '',
    checkedAt: '',
    preferences: {
      channel: 'stable',
      autoDownload: true,
      autoInstall: false,
      installHourUTC: 3
    },
    previousVersion: '',
    failedVersion: '',
    canRollback: false,
    noticeId: ''
  }
}
