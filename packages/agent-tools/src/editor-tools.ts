import type { Tool } from './types.js'

const identity = {
  workspaceId: { type: 'string', format: 'uuid' },
  kind: { type: 'string', enum: ['page', 'record', 'note'] },
  id: { type: 'string', format: 'uuid' }
}
const block = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { const: 'block' },
    id: { type: 'string' },
    flavour: { type: 'string' },
    version: { type: 'integer' },
    props: { type: 'object' },
    children: { type: 'array', items: { $ref: '#/$defs/block' } }
  },
  required: ['type', 'id', 'flavour', 'version', 'props', 'children']
}

export const editorTools: Tool[] = [
  {
    name: 'monolith_document_read',
    access: 'read',
    method: 'GET',
    path: '/api/v1/editor-documents/{kind}/{id}',
    description:
      'Read the current canonical BlockSuite document snapshot and revision. Use this for page, record and note body content. A 404 may require document_initialize once. Keep the complete snapshot when editing; preserve unrelated blocks.',
    inputSchema: {
      type: 'object',
      properties: identity,
      required: Object.keys(identity),
      additionalProperties: false
    }
  },
  {
    name: 'monolith_document_initialize',
    access: 'write',
    method: 'POST',
    path: '/api/v1/editor-documents/{kind}/{id}/initialize',
    description:
      'Initialize an existing page, record or note in the canonical editor. This preserves existing content and returns the current snapshot and revision. Requires write access.',
    inputSchema: {
      type: 'object',
      properties: identity,
      required: Object.keys(identity),
      additionalProperties: false
    }
  },
  {
    name: 'monolith_document_save',
    access: 'write',
    method: 'PUT',
    path: '/api/v1/editor-documents/{kind}/{id}',
    description:
      'Save a complete canonical BlockSuite snapshot using the revision returned by document_read. Preserve unrelated blocks and their IDs. Never force or automatically retry a revision conflict: re-read, reconcile changes, then save. Recovery documents are read-only.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      $defs: { block },
      properties: {
        ...identity,
        expectedRevision: { type: 'integer', minimum: 1 },
        snapshot: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { const: 'page' },
            meta: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                createDate: { type: 'integer' },
                tags: { type: 'array', items: { type: 'string' } }
              },
              required: ['id', 'title', 'createDate', 'tags']
            },
            blocks: { $ref: '#/$defs/block' }
          },
          required: ['type', 'meta', 'blocks']
        }
      },
      required: [...Object.keys(identity), 'expectedRevision', 'snapshot']
    }
  }
]
