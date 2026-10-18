import z from 'zod'

export const iconStyles = [
  'lucide',
  'tabler',
  'ph',
  'ph-fill',
  'ri-line',
  'ri-fill',
  'mdi'
] as const

export const fontProviders = [
  'system',
  'google',
  'bunny',
  'fontsource'
] as const

export const fontFamilies = [
  'Inter',
  'Lato',
  'Nunito Sans',
  'Open Sans',
  'Roboto',
  'Source Sans 3',
  'Lora',
  'JetBrains Mono',
  'system-ui',
  'serif',
  'monospace'
] as const

export const appearanceColor = z.string().regex(/^#[0-9a-f]{6}$/i)

export const appearanceIcon = z
  .string()
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]{0,31}:[a-z0-9-]{1,60}$/)

export function safeCoverUrl(value: string) {
  try {
    const url = new URL(value)

    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export const appearanceSchema = z
  .object({
    background: appearanceColor.optional(),
    accent: appearanceColor.optional(),
    button: appearanceColor.optional(),
    icons: appearanceColor.optional(),
    iconSet: z.enum(iconStyles).optional(),
    icon: appearanceIcon.optional(),
    font: z
      .object({
        provider: z.enum(fontProviders),
        family: z.enum(fontFamilies)
      })
      .strict()
      .refine(font =>
        font.provider === 'system'
          ? ['system-ui', 'serif', 'monospace'].includes(font.family)
          : !['system-ui', 'serif', 'monospace'].includes(font.family)
      )
      .optional(),
    cover: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('color'), value: appearanceColor }).strict(),
        z
          .object({
            type: z.literal('image'),
            value: z.string().max(2048),
            fileKey: z
              .string()
              .max(2048)
              .regex(/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]+$/)
              .refine(key => !key.split('/').includes('..'))
              .optional(),
            position: z.number().min(0).max(100).default(50)
          })
          .strict()
          .refine(cover =>
            cover.fileKey ? cover.value === '' : safeCoverUrl(cover.value)
          )
      ])
      .nullable()
      .optional(),
    radius: z.number().int().min(0).max(24).optional(),
    contentWidth: z.enum(['standard', 'full']).optional()
  })
  .strict()

export type Appearance = z.infer<typeof appearanceSchema>

export type AppearanceScope = 'global' | 'workspace' | 'page'

export const appearanceRecordSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    appearance: appearanceSchema
  })
  .strict()

export type AppearanceRecord = z.infer<typeof appearanceRecordSchema>

export const APPEARANCE_LAYOUT_KEY = '__appearance'

/** Icon identity belongs to a page or workspace, while visual tokens inherit. */
export function resolveAppearance(
  global: Appearance = {},
  workspace: Appearance = {},
  page: Appearance = {}
): Appearance {
  const { icon: _globalIcon, ...globalTokens } = global
  const { icon: _workspaceIcon, ...workspaceTokens } = workspace

  return { ...globalTokens, ...workspaceTokens, ...page }
}

export function readAppearanceRecord(
  layout: Record<string, unknown> | null | undefined
): AppearanceRecord {
  const parsed = appearanceRecordSchema.safeParse(
    layout?.[APPEARANCE_LAYOUT_KEY]
  )

  return parsed.success ? parsed.data : { revision: 0, appearance: {} }
}

const fontIds: Record<string, string> = {
  Inter: 'inter',
  Lato: 'lato',
  'Nunito Sans': 'nunito-sans',
  'Open Sans': 'open-sans',
  Roboto: 'roboto',
  'Source Sans 3': 'source-sans-3',
  Lora: 'lora',
  'JetBrains Mono': 'jetbrains-mono'
}

export function fontStylesheet(font: NonNullable<Appearance['font']>) {
  if (font.provider === 'system') return null
  if (font.provider === 'google')
    return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`

  const id = fontIds[font.family]

  if (!id) return null
  if (font.provider === 'bunny')
    return `https://fonts.bunny.net/css?family=${id}:400,500,600,700&display=swap`

  return `https://cdn.jsdelivr.net/fontsource/css/${id}@5/index.css`
}

export const iconProviders = [
  {
    id: 'lucide',
    name: 'Lucide',
    style: 'outline',
    license: 'ISC',
    href: 'https://lucide.dev',
    sample: 'lucide:sparkles'
  },
  {
    id: 'tabler',
    name: 'Tabler',
    style: 'outline',
    license: 'MIT',
    href: 'https://tabler.io/icons',
    sample: 'tabler:sparkles'
  },
  {
    id: 'ph',
    name: 'Phosphor',
    style: 'rounded',
    license: 'MIT',
    href: 'https://phosphoricons.com',
    sample: 'ph:sparkle'
  },
  {
    id: 'ph-fill',
    name: 'Phosphor',
    style: 'filled',
    license: 'MIT',
    href: 'https://phosphoricons.com',
    sample: 'ph:sparkle-fill'
  },
  {
    id: 'ri-line',
    name: 'Remix',
    style: 'outline',
    license: 'Apache-2.0',
    href: 'https://remixicon.com',
    sample: 'ri:sparkling-line'
  },
  {
    id: 'ri-fill',
    name: 'Remix',
    style: 'filled',
    license: 'Apache-2.0',
    href: 'https://remixicon.com',
    sample: 'ri:sparkling-fill'
  },
  {
    id: 'mdi',
    name: 'Material Design',
    style: 'filled',
    license: 'Apache-2.0',
    href: 'https://pictogrammers.com/library/mdi',
    sample: 'mdi:star-four-points'
  }
] as const

// Explicit semantic aliases keep unsupported icons intact instead of requesting missing SVGs.
const iconAliases: Record<string, [string, string, string, string]> = {
  'file-text': ['file-text', 'file-text', 'file-text', 'file-document-outline'],
  files: ['files', 'files', 'file-copy', 'file-multiple-outline'],
  layers: ['stack-2', 'stack', 'stack', 'layers-outline'],
  'layers-2': ['stack-2', 'stack', 'stack', 'layers-outline'],
  house: ['home', 'house', 'home', 'home-outline'],
  home: ['home', 'house', 'home', 'home-outline'],
  'calendar-days': [
    'calendar',
    'calendar-dots',
    'calendar',
    'calendar-month-outline'
  ],
  calendar: ['calendar', 'calendar', 'calendar', 'calendar-outline'],
  database: ['database', 'database', 'database-2', 'database-outline'],
  puzzle: ['puzzle', 'puzzle-piece', 'puzzle', 'puzzle-outline'],
  settings: ['settings', 'gear', 'settings-3', 'cog-outline'],
  search: ['search', 'magnifying-glass', 'search', 'magnify'],
  plus: ['plus', 'plus', 'add', 'plus'],
  x: ['x', 'x', 'close', 'close'],
  check: ['check', 'check', 'check', 'check'],
  'circle-check': [
    'circle-check',
    'check-circle',
    'checkbox-circle',
    'check-circle-outline'
  ],
  'user-round': ['user', 'user', 'user', 'account-outline'],
  users: ['users', 'users', 'group', 'account-group-outline'],
  folder: ['folder', 'folder', 'folder', 'folder-outline'],
  palette: ['palette', 'palette', 'palette', 'palette-outline'],
  image: ['photo', 'image', 'image', 'image-outline'],
  sparkles: ['sparkles', 'sparkle', 'sparkling', 'star-four-points'],
  sun: ['sun', 'sun', 'sun', 'white-balance-sunny'],
  moon: ['moon', 'moon', 'moon', 'moon-waning-crescent'],
  'chart-no-axes-combined': [
    'chart-line',
    'chart-line',
    'line-chart',
    'chart-line'
  ],
  'chevron-down': [
    'chevron-down',
    'caret-down',
    'arrow-down-s',
    'chevron-down'
  ],
  'chevron-right': [
    'chevron-right',
    'caret-right',
    'arrow-right-s',
    'chevron-right'
  ],
  pencil: ['pencil', 'pencil-simple', 'edit', 'pencil-outline'],
  'trash-2': ['trash', 'trash', 'delete-bin', 'trash-can-outline'],
  'panel-left': [
    'layout-sidebar',
    'sidebar',
    'side-bar',
    'page-layout-sidebar-left'
  ],
  'arrow-up': ['arrow-up', 'arrow-up', 'arrow-up', 'arrow-up'],
  'arrow-down': ['arrow-down', 'arrow-down', 'arrow-down', 'arrow-down'],
  'external-link': [
    'external-link',
    'arrow-square-out',
    'external-link',
    'open-in-new'
  ]
}

const canonicalIcons = Object.fromEntries(
  Object.entries(iconAliases).flatMap(([name, aliases]) => [
    [`tabler:${aliases[0]}`, name],
    [`ph:${aliases[1]}`, name],
    [`ph:${aliases[1]}-fill`, name],
    [`ri:${aliases[2]}-line`, name],
    [`ri:${aliases[2]}-fill`, name],
    [`mdi:${aliases[3]}`, name]
  ])
)

export function styledIcon(icon: string, style?: Appearance['iconSet']) {
  if (!style) return icon

  const canonical = icon.startsWith('lucide:')
    ? icon.slice(7)
    : canonicalIcons[icon]
  const names = iconAliases[canonical]

  if (!names) return icon
  if (style === 'lucide') return `lucide:${canonical}`
  if (style === 'tabler') return `tabler:${names[0]}`
  if (style === 'ph' || style === 'ph-fill')
    return `ph:${names[1]}${style === 'ph-fill' ? '-fill' : ''}`
  if (style === 'mdi') return `mdi:${names[3]}`

  return `ri:${names[2]}-${style === 'ri-fill' ? 'fill' : 'line'}`
}
