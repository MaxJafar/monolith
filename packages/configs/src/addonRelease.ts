import { z } from 'zod'

export const addonIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$/)
export const releaseVersionSchema = z
  .string()
  .max(80)
  .regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/)
export const coreAddonIds = [
  'monolith--calendar',
  'monolith--projects',
  'monolith--todo-list',
  'monolith--notes',
  'monolith--databases'
] as const
export const addonReleaseSchema = z.object({
  id: addonIdSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(1200),
  icon: z.string().max(100),
  category: z.string().max(80),
  kind: z.enum(['addon', 'widget']),
  version: releaseVersionSchema,
  hostVersion: releaseVersionSchema,
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z
    .number()
    .int()
    .positive()
    .max(96 * 1024 * 1024),
  schemaHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  notes: z.string().max(12000).default(''),
  widgets: z.array(z.string().max(100)).max(100).default([])
})
export const addonCatalogSchema = z
  .object({
    format: z.literal(1),
    releases: z.array(addonReleaseSchema).max(300)
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.releases.map(item => item.id)).size !==
      value.releases.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate addon identities' })
  })
export const addonJobSchema = z.object({
  id: z.string(),
  addonId: addonIdSchema,
  version: releaseVersionSchema,
  phase: z.enum([
    'queued',
    'downloading',
    'verifying',
    'installing',
    'complete',
    'failed'
  ]),
  received: z.number(),
  total: z.number(),
  error: z.string().optional()
})
export type AddonRelease = z.infer<typeof addonReleaseSchema>
export type AddonJob = z.infer<typeof addonJobSchema>
export type AddonCatalog = z.infer<typeof addonCatalogSchema>

/** Numeric semver ordering, including release candidates. Never offer a downgrade. */
export function compareReleaseVersions(a: string, b: string): number {
  const [av, ...aparts] = a.split('-'),
    [bv, ...bparts] = b.split('-')
  const ap = aparts.join('-'),
    bp = bparts.join('-')
  const aa = av!.split('.').map(Number),
    bb = bv!.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i]! - bb[i]!
  if (!ap || !bp) return ap === bp ? 0 : ap ? -1 : 1
  const ac = ap.split('.'),
    bc = bp.split('.')
  for (let i = 0; i < Math.max(ac.length, bc.length); i++) {
    if (ac[i] === bc[i]) continue
    if (ac[i] === undefined || bc[i] === undefined)
      return ac[i] === undefined ? -1 : 1
    const an = /^\d+$/.test(ac[i]!),
      bn = /^\d+$/.test(bc[i]!)
    return an && bn
      ? Number(ac[i]) - Number(bc[i])
      : an !== bn
        ? an
          ? -1
          : 1
        : ac[i]! < bc[i]!
          ? -1
          : 1
  }
  return 0
}
