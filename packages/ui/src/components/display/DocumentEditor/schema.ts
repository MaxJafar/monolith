import { AffineSchemas } from '@blocksuite/affine/schemas'
import {
  BlockModel,
  BlockSchemaIdentifier,
  type BlockSchemaType,
  type ExtensionType,
  defineBlockSchema
} from '@blocksuite/store'

export const ColumnsSchema: BlockSchemaType = defineBlockSchema({
  flavour: 'monolith:columns',
  props: () => ({ count: 2 }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note'],
    children: ['monolith:column']
  },
  toModel: () => new BlockModel<{ count: number }>()
})

export const ColumnSchema: BlockSchemaType = defineBlockSchema({
  flavour: 'monolith:column',
  props: () => ({}),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['monolith:columns'],
    children: [
      'affine:*',
      'monolith:linked-database',
      'monolith:module',
      'monolith:group'
    ]
  },
  toModel: () => new BlockModel()
})

export const LinkedDatabaseSchema: BlockSchemaType = defineBlockSchema({
  flavour: 'monolith:linked-database',
  props: () => ({ workspaceId: '', baseId: '', viewId: '', height: 0 }),
  metadata: {
    version: 1,
    role: 'content',
    parent: [
      'affine:note',
      'monolith:column',
      'monolith:group',
      'affine:callout'
    ],
    children: []
  },
  toModel: () =>
    new BlockModel<{
      workspaceId: string
      baseId: string
      viewId: string
      height: number
    }>()
})

export const ModuleSchema: BlockSchemaType = defineBlockSchema({
  flavour: 'monolith:module',
  props: () => ({ moduleId: '', widgetId: '', config: {} }),
  metadata: {
    version: 1,
    role: 'content',
    parent: [
      'affine:note',
      'monolith:column',
      'monolith:group',
      'affine:callout'
    ],
    children: []
  },
  toModel: () =>
    new BlockModel<{ moduleId: string; widgetId: string; config: object }>()
})

export const GroupSchema: BlockSchemaType = defineBlockSchema({
  flavour: 'monolith:group',
  props: () => ({ kind: 'document', title: '' }),
  metadata: {
    version: 1,
    role: 'content',
    parent: [
      'affine:note',
      'monolith:column',
      'monolith:group',
      'affine:list',
      'affine:paragraph',
      'affine:callout'
    ]
  },
  toModel: () => new BlockModel<{ kind: string; title: string }>()
})

// Upstream content schemas explicitly enumerate parents. Extend them through the
// public schema extension API; never patch the installed BlockSuite packages.
export const monolithSchemas: ExtensionType[] = [
  ...(AffineSchemas as BlockSchemaType[])
    .filter(
      schema =>
        schema.model.role === 'content' ||
        schema.model.flavour === 'affine:callout'
    )
    .map(schema => ({
      ...schema,
      model: {
        ...schema.model,
        ...(schema.model.flavour === 'affine:callout'
          ? {
              children: [
                ...(schema.model.children ?? []),
                'monolith:linked-database',
                'monolith:module',
                'monolith:group'
              ]
            }
          : {}),
        props: (
          internal: Parameters<
            NonNullable<BlockSchemaType['model']['props']>
          >[0]
        ) => ({
          ...schema.model.props?.(internal),
          'monolith:anchors': [],
          'monolith:numbering': null,
          'monolith:background': ''
        }),
        // No parent list means "any parent" upstream (dividers, for example).
        // Only extend explicit lists, or those blocks could not sit in a note.
        parent: schema.model.parent && [
          ...schema.model.parent,
          'monolith:column',
          'monolith:group'
        ]
      }
    })),
  ColumnsSchema,
  ColumnSchema,
  LinkedDatabaseSchema,
  ModuleSchema,
  GroupSchema
].map(schema => ({
  setup: di => {
    di.override(BlockSchemaIdentifier(schema.model.flavour), () => schema)
  }
}))
