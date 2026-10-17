import { appearanceIcon, appearanceSchema, canvasKey } from '@monolith/blocks'
import z from 'zod'

export const coreAreas = [
  'calendar',
  'projects',
  'actions',
  'docs',
  'dashboard',
  'databases'
] as const

export const coreAddonPaths = new Set([
  'calendar',
  'projects',
  'todo-list',
  'actions',
  'notes',
  'docs',
  'databases'
])

const groupId = z.union([z.enum(['pages', 'addons']), z.string().uuid()])

export const navigationSchema = z
  .object({
    revision: z.number().int().nonnegative().default(0),
    appearance: appearanceSchema.optional(),
    pageAppearance: z
      .record(z.string().refine(canvasKey), appearanceSchema)
      .refine(pages => Object.keys(pages).length <= 1000)
      .optional(),
    groups: z
      .array(
        z.object({
          id: z.string().uuid(),
          name: z.string().trim().min(1).max(80),
          icon: appearanceIcon.optional(),
          color: z
            .string()
            .regex(/^#[0-9a-f]{6}$/i)
            .optional()
        })
      )
      .max(50)
      .default([]),
    items: z
      .array(
        z.object({
          key: z.string().regex(/^(page:[0-9a-f-]{36}|addon:[a-z0-9-]+)$/),
          group: groupId,
          hidden: z.boolean().default(false),
          archived: z.boolean().optional(),
          label: z.string().trim().min(1).max(80).optional(),
          icon: appearanceIcon.optional(),
          color: z
            .string()
            .regex(/^#[0-9a-f]{6}$/i)
            .optional()
        })
      )
      .max(2000)
      .default([])
  })
  .superRefine((value, context) => {
    const groups = new Set([
      'pages',
      'addons',
      ...value.groups.map(group => group.id)
    ])

    if (
      groups.size !== value.groups.length + 2 ||
      new Set(value.items.map(item => item.key)).size !== value.items.length ||
      value.items.some(item => !groups.has(item.group))
    )
      context.addIssue({
        code: 'custom',
        message: 'Sidebar groups and items must be unique and valid'
      })
  })

export type WorkspaceNavigation = z.infer<typeof navigationSchema>

export function moveNavigationItem(
  navigation: WorkspaceNavigation,
  key: string,
  group: string,
  before?: string
): WorkspaceNavigation {
  const previous = navigation.items.find(item => item.key === key)
  const items = navigation.items.filter(item => item.key !== key)
  const index = before ? items.findIndex(item => item.key === before) : -1
  items.splice(index < 0 ? items.length : index, 0, {
    ...previous,
    key,
    group,
    hidden: previous?.hidden ?? false
  })

  return { ...navigation, items }
}

/** Archiving a page also removes its descendants from navigation, without deleting content. */
export function archivedNavigationKeys(
  navigation: WorkspaceNavigation,
  pages: readonly { key: string; id: string; parent: string | null }[]
): Set<string> {
  const archived = new Set(
    navigation.items.filter(item => item.archived).map(item => item.key)
  )
  const descendants = new Map<string, string[]>()

  for (const page of pages) {
    if (!page.parent) continue

    const key = 'page:' + page.parent
    descendants.set(key, [...(descendants.get(key) ?? []), page.key])
  }

  const queue = [...archived]

  for (let index = 0; index < queue.length; index++) {
    for (const child of descendants.get(queue[index]!) ?? []) {
      if (archived.has(child)) continue
      archived.add(child)
      queue.push(child)
    }
  }

  return archived
}
