import { z } from 'zod'

export const modeSchema = z.enum(['blackboard', 'canvas'])

export type Mode = z.infer<typeof modeSchema>

const id = z.string().uuid()
const coordinate = z.number().finite().min(-100000).max(100000)
const color = z.string().regex(/^#[\da-f]{6}$/i)
const componentProperties = new Set([
  'kind',
  'name',
  'width',
  'height',
  'rotation',
  'fill',
  'fillOpacity',
  'stroke',
  'strokeWidth',
  'opacity',
  'radius',
  'text',
  'fontSize',
  'fontWeight',
  'textColor',
  'align',
  'locked',
  'hidden',
  'layout',
  'widthMode',
  'heightMode',
  'points',
  'pathData',
  'pathViewBox',
  'fillRule',
  'vector',
  'gradient',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'verticalAlign',
  'textPadding',
  'clipContent',
  'prototype',
  'image'
])

export const layoutSchema = z.object({
  direction: z.enum(['horizontal', 'vertical']),
  gap: z.number().finite().min(0).max(2000),
  padding: z.object({
    top: z.number().min(0).max(2000),
    right: z.number().min(0).max(2000),
    bottom: z.number().min(0).max(2000),
    left: z.number().min(0).max(2000)
  }),
  align: z.enum(['start', 'center', 'end', 'stretch']),
  justify: z.enum(['start', 'center', 'end', 'space-between']),
  wrap: z.boolean()
})

export type Layout = z.infer<typeof layoutSchema>

const pointSchema = z.object({ x: coordinate, y: coordinate })

export const vectorSchema = z
  .array(
    z.object({
      id,
      closed: z.boolean(),
      nodes: z
        .array(
          z.object({
            id,
            x: coordinate,
            y: coordinate,
            mode: z.enum(['corner', 'smooth', 'symmetric']),
            in: pointSchema.nullable(),
            out: pointSchema.nullable()
          })
        )
        .min(1)
        .max(2000)
    })
  )
  .min(1)
  .max(100)

export type Vector = z.infer<typeof vectorSchema>

export type VectorNode = Vector[number]['nodes'][number]

export const prototypeSchema = z.object({
  trigger: z.enum(['click', 'hover']),
  action: z.enum(['navigate', 'overlay', 'back', 'close']),
  target: id.nullable(),
  transition: z.enum(['instant', 'dissolve']),
  duration: z.number().int().min(0).max(3000)
})

export const gradientSchema = z.object({
  type: z.enum(['linear', 'radial']),
  transform: z.array(coordinate).length(6).optional(),
  start: pointSchema,
  end: pointSchema,
  stops: z
    .array(
      z.object({
        offset: z.number().min(0).max(1),
        color,
        opacity: z.number().min(0).max(1)
      })
    )
    .min(2)
    .max(32)
})

export const elementSchema = z.object({
  id,
  kind: z.enum([
    'rectangle',
    'ellipse',
    'diamond',
    'text',
    'sticky',
    'node',
    'frame',
    'path',
    'image'
  ]),
  name: z.string().max(160),
  x: coordinate,
  y: coordinate,
  width: z.number().finite().min(1).max(20000),
  height: z.number().finite().min(1).max(20000),
  rotation: z.number().finite().min(-360).max(360),
  fill: color,
  fillOpacity: z.number().finite().min(0).max(1).optional(),
  stroke: color,
  strokeWidth: z.number().finite().min(0).max(40),
  opacity: z.number().finite().min(0).max(1),
  radius: z.number().finite().min(0).max(1000),
  text: z.string().max(10000),
  fontSize: z.number().finite().min(8).max(400),
  fontWeight: z.enum(['400', '600', '700']),
  textColor: color,
  align: z.enum(['left', 'center', 'right']),
  locked: z.boolean(),
  hidden: z.boolean(),
  group: id.nullable(),
  parent: id.nullable().optional(),
  layout: layoutSchema.optional(),
  widthMode: z.enum(['fixed', 'hug', 'fill']).optional(),
  heightMode: z.enum(['fixed', 'hug', 'fill']).optional(),
  component: z
    .object({
      definition: id,
      instance: id,
      key: id,
      overrides: z
        .array(
          z
            .string()
            .refine(
              key => componentProperties.has(key),
              'Unsupported component override'
            )
        )
        .max(40)
    })
    .optional(),
  points: z.array(z.object({ x: coordinate, y: coordinate })).max(10000),
  pathData: z
    .string()
    .max(200000)
    .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]*$/)
    .optional(),
  pathViewBox: z
    .object({
      x: coordinate,
      y: coordinate,
      width: z.number().finite().positive().max(20000),
      height: z.number().finite().positive().max(20000)
    })
    .optional(),
  fillRule: z.enum(['nonzero', 'evenodd']).optional(),
  vector: vectorSchema.optional(),
  gradient: gradientSchema.optional(),
  fontFamily: z
    .string()
    .max(120)
    .regex(/^[\p{L}\p{N} _-]+$/u)
    .optional(),
  lineHeight: z.number().finite().min(0.1).max(10).optional(),
  letterSpacing: z.number().finite().min(-100).max(100).optional(),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  textPadding: z.number().finite().min(0).max(1000).optional(),
  clipContent: z.boolean().optional(),
  prototype: prototypeSchema.optional(),
  // Raster data only: imported SVG/HTML never executes in the host application.
  image: z
    .string()
    .max(2000000)
    .regex(/^(?:|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/)
})

export type Element = z.infer<typeof elementSchema>

export const connectorSchema = z.object({
  id,
  source: id,
  target: id,
  label: z.string().max(200),
  color,
  style: z.enum(['curve', 'straight']),
  arrow: z.boolean()
})

export type Connector = z.infer<typeof connectorSchema>

export const pageSchema = z.object({
  id,
  name: z.string().trim().min(1).max(160),
  mode: modeSchema,
  background: color,
  elements: z.array(elementSchema).max(2000),
  connectors: z.array(connectorSchema).max(4000)
})

export type Page = z.infer<typeof pageSchema>

export const componentSchema = z.object({
  id,
  name: z.string().trim().min(1).max(160),
  elements: z.array(elementSchema).min(1).max(500),
  connectors: z.array(connectorSchema).max(1000)
})

export type ComponentDefinition = z.infer<typeof componentSchema>

export const documentSchema = z
  .object({
    version: z.literal(1),
    tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    prototypeStart: id.optional(),
    pages: z.array(pageSchema).min(1).max(40),
    components: z.array(componentSchema).max(100).optional()
  })
  .superRefine((document, ctx) => {
    const ids = new Set<string>()

    let total = 0

    for (const page of [...document.pages, ...(document.components ?? [])]) {
      for (const item of [page, ...page.elements, ...page.connectors]) {
        if (ids.has(item.id))
          ctx.addIssue({ code: 'custom', message: 'Duplicate object identity' })
        ids.add(item.id)
      }

      const elements = new Set(page.elements.map(item => item.id))
      const byId = new Map(page.elements.map(item => [item.id, item]))

      for (const element of page.elements) {
        let parent = element.parent

        const ancestors = new Set([element.id])

        while (parent) {
          const container = byId.get(parent)

          if (
            !container ||
            container.kind !== 'frame' ||
            ancestors.has(parent) ||
            ancestors.size > 32
          ) {
            ctx.addIssue({
              code: 'custom',
              message: 'Invalid or cyclic frame hierarchy'
            })
            break
          }
          ancestors.add(parent)
          parent = container.parent
        }
        if (element.layout && element.kind !== 'frame')
          ctx.addIssue({
            code: 'custom',
            message: 'Only frames support auto-layout'
          })
        if (
          element.component &&
          !(document.components ?? []).some(
            c =>
              c.id === element.component!.definition &&
              c.elements.some(part => part.id === element.component!.key)
          )
        )
          ctx.addIssue({
            code: 'custom',
            message: 'Missing component definition'
          })
      }

      for (const edge of page.connectors)
        if (
          edge.source === edge.target ||
          !elements.has(edge.source) ||
          !elements.has(edge.target)
        )
          ctx.addIssue({
            code: 'custom',
            message: 'Connections must join two objects on the same page'
          })
      total += page.elements.length + page.connectors.length
    }
    if (total > 6000)
      ctx.addIssue({
        code: 'custom',
        message: 'Document object limit exceeded'
      })
    if (JSON.stringify(document).length > 4000000)
      ctx.addIssue({ code: 'custom', message: 'Document exceeds 4 MB' })
  })

export type Document = z.infer<typeof documentSchema>

export const projectSchema = z.object({
  id,
  workspace_id: id,
  title: z.string().trim().min(1).max(160),
  revision: z.number().int().positive(),
  starred: z.boolean(),
  archived: z.boolean(),
  created: z.string(),
  updated: z.string(),
  document: documentSchema
})

export type Project = z.infer<typeof projectSchema>

export const summarySchema = projectSchema.omit({ document: true }).extend({
  tags: z.array(z.string()).optional(),
  modes: z.array(modeSchema),
  objects: z.number().int().nonnegative()
})

export type ProjectSummary = z.infer<typeof summarySchema>

export const scopeSchema = z.object({ workspace_id: id })

export const saveSchema = z.object({
  id,
  expected_revision: z.number().int().positive(),
  title: projectSchema.shape.title,
  document: documentSchema
})

export const snapshotSchema = z.object({
  title: projectSchema.shape.title,
  document: documentSchema
})

export type Snapshot = z.infer<typeof snapshotSchema>

export const presenceSchema = z.object({
  page: id,
  cursor: z.object({ x: coordinate, y: coordinate }).nullable(),
  selection: z.array(id).max(50)
})

export type Presence = z.infer<typeof presenceSchema>

export const peerSchema = presenceSchema.extend({
  user: id,
  session: id,
  name: z.string(),
  color,
  role: z.enum(['owner', 'editor', 'viewer'])
})

export type Peer = z.infer<typeof peerSchema>

export const syncSchema = z.object({
  id,
  session: id,
  revision: z.number().int().nonnegative(),
  presence: presenceSchema,
  change: z
    .object({
      sequence: z.number().int().positive().max(2147483647),
      base: snapshotSchema,
      next: snapshotSchema
    })
    .optional()
})

export const syncResultSchema = z.object({
  project: projectSchema.nullable(),
  peers: z.array(peerSchema),
  role: z.enum(['owner', 'editor', 'viewer'])
})

export const commentSchema = z.object({
  id,
  project_id: id,
  page_id: id,
  element_id: id.nullable(),
  parent_id: id.nullable(),
  actor_id: id,
  name: z.string(),
  x: coordinate,
  y: coordinate,
  body: z.string().trim().min(1).max(5000),
  resolved: z.boolean(),
  created: z.string()
})

export type Comment = z.infer<typeof commentSchema>

export type SyncRequest = z.infer<typeof syncSchema>

export type SyncResult = z.infer<typeof syncResultSchema>
