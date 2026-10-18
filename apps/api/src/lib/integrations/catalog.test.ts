import { describe, expect, it } from 'vitest'

import { findAddonIdentity } from '@monolith/configs'
import type { Route } from '@monolith/server-utils'

import { buildAgentCatalog } from './catalog'

const prefix = `/modules/${findAddonIdentity('@monolith/databases')!.remoteId}/workspaces`
const route = (path: string, overrides: Partial<Route> = {}): Route => ({
  method: 'POST',
  path,
  description: 'Fixture',
  schema: { response: null },
  noAuth: false,
  ...overrides
})
describe('agent catalog', () => {
  it('exposes only reviewed installed routes and preserves the live input schema', () => {
    const body = {
      allOf: [
        {
          type: 'object',
          properties: { title: { type: 'string' } },
          required: ['title']
        }
      ]
    }
    const catalog = buildAgentCatalog([
      route(`${prefix}/createPage`, { input: { body } }),
      route(`${prefix}/setMember`),
      route('/auth/login'),
      route('/apiKeys/list'),
      route('/updates/action'),
      route('/modules/install'),
      route(`${prefix}/savePage`)
    ])
    expect(catalog.tools).toHaveLength(1)
    expect(catalog.tools[0]).toMatchObject({
      name: 'monolith_pages_create',
      access: 'write',
      inputSchema: { properties: { body }, required: ['body'] }
    })
    expect(buildAgentCatalog([]).tools).toEqual([])
  })
  it('does not expose public, file download or upload handlers', () => {
    for (const flags of [
      { noAuth: true },
      { isDownloadable: true },
      { media: { image: {} } }
    ])
      expect(
        buildAgentCatalog([route(`${prefix}/createPage`, flags)]).tools
      ).toEqual([])
  })
  it('leaves defaulted input fields optional so the API can supply their values', () => {
    const body = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        parent_id: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
          default: null
        }
      },
      required: ['title', 'parent_id']
    }
    const catalog = buildAgentCatalog([
      route(`${prefix}/createPage`, { input: { body } })
    ])
    expect(catalog.tools[0]?.inputSchema.properties.body).toMatchObject({
      required: ['title']
    })
    expect(body.required).toEqual(['title', 'parent_id'])
  })
  it('marks destructive POSTs and read-only resolution correctly', () => {
    const catalog = buildAgentCatalog([
      route(`${prefix}/removePage`),
      route('/entities/resolve')
    ])
    expect(catalog.tools.map(tool => [tool.name, tool.access])).toContainEqual([
      'monolith_pages_delete',
      'delete'
    ])
    expect(catalog.tools.map(tool => [tool.name, tool.access])).toContainEqual([
      'monolith_entities_resolve',
      'read'
    ])
  })
})
