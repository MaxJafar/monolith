import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type AppearanceRecord, type CanvasPage } from '@monolith/blocks'
import type { EndpointContract } from '@monolith/server-utils'

import type { WorkspaceNavigation } from '../../../../modules/monolith--databases/navigationShared'
import {
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as workspaceRoutes from '../../../../modules/monolith--databases/server/workspaceRoutes'
import * as appearanceRoutes from '../lib/user/routes/appearance'
import * as personalizationRoutes from '../lib/user/routes/personalization'
import { users } from '../lib/user/schema.drizzle'

const enabled = process.env.MONOLITH_APPEARANCE_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''
const adminConnection = process.env.DATABASE_ADMIN_URL ?? ''
if (enabled)
  for (const uri of [connection, adminConnection]) {
    const target = new URL(uri)
    if (
      process.env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.port !== '55432' ||
      target.pathname !== '/zillion_dev'
    )
      throw Error('Appearance fixtures require the isolated loopback database')
  }
const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/disabled',
  { max: 3 }
)
const admin = postgres(
  enabled ? adminConnection : 'postgres://127.0.0.1:55432/disabled',
  { max: 1, onnotice: () => {} }
)
const db = drizzle({
  client,
  relations: defineRelations({ ...tables, users }, r => ({
    ...relations(r as Parameters<typeof relations>[0])
  }))
})
const accounts = [randomUUID(), randomUUID(), randomUUID()]
const spaces = [randomUUID(), randomUUID()]
const pageId = randomUUID(),
  otherPageId = randomUUID()
const group = randomUUID()
const initialNavigation = {
  revision: 0,
  groups: [{ id: group, name: 'Fixture addons' }],
  items: [{ key: 'addon:wallet', group, hidden: false, label: 'My wallet' }]
}
const page: CanvasPage = {
  version: 1,
  title: 'Appearance fixture',
  icon: 'lucide:file-text',
  fullWidth: false,
  revision: 1,
  updated: null,
  blocks: []
}
type Context = Parameters<ReturnType<EndpointContract['getValue']>['callback']>[0]
async function invoke<T>(
  route: EndpointContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = {}
) {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    const response = await endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query),
      res: { locals: { userId: actor } }
    } as unknown as Context)
    if (response.$status >= 400) throw Error(`Rejected ${response.$status}`)
    return response
  })
  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
beforeAll(async () => {
  if (!enabled) return
  for (const id of accounts)
    await admin`insert into users(id,email,username,name,dashboard_layout) values(${id},${'appearance-' + id + '@example.invalid'},${id},'Synthetic appearance fixture',${admin.json({ calendar: [{ i: 'calendar' }] })})`
  for (const id of spaces)
    await admin`insert into zillion_databases__workspaces(id,owner_id,name,navigation,enabled_modules) values(${id},${accounts[0]!},'Synthetic appearance fixture',${admin.json(initialNavigation)},'["wallet"]'::jsonb)`
  await admin`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${accounts[0]!},${spaces[0]!},${accounts[1]!},'editor'),(${accounts[0]!},${spaces[0]!},${accounts[2]!},'viewer')`
  for (const [id, space] of [
    [pageId, spaces[0]!],
    [otherPageId, spaces[1]!]
  ])
    await admin`insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body) values(${id!},${accounts[0]!},${space!},${'/page/' + id},'Appearance fixture',${admin.json(page)})`
})
afterAll(async () => {
  if (enabled) {
    for (const id of spaces)
      await admin`delete from zillion_databases__workspaces where id=${id}`
    for (const id of accounts) await admin`delete from users where id=${id}`
  }
  await Promise.all([client.end(), admin.end()])
})

describe.skipIf(!enabled)(
  'Persisted appearance permissions and revisions',
  () => {
    it('keeps account settings isolated and preserves dashboard layouts', async () => {
      const saved = await invoke<AppearanceRecord>(
        appearanceRoutes.saveAppearance,
        accounts[0]!,
        {
          appearance: {
            background: '#f4f7f2',
            button: '#486346',
            font: { provider: 'bunny', family: 'Inter' }
          },
          expected_revision: 0
        }
      )
      expect(saved.revision).toBe(1)
      expect(
        await invoke(appearanceRoutes.getAppearance, accounts[0]!)
      ).toEqual(saved)
      expect(
        await invoke(appearanceRoutes.getAppearance, accounts[1]!)
      ).toEqual({ revision: 0, appearance: {} })
      await invoke(personalizationRoutes.updatePersonalization, accounts[0]!, {
        data: {
          dashboardLayout: {
            projects: [],
            __appearance: { revision: 999, appearance: {} }
          }
        }
      })
      expect(
        await invoke(appearanceRoutes.getAppearance, accounts[0]!)
      ).toEqual(saved)
      const [user] =
        await admin`select dashboard_layout from users where id=${accounts[0]!}`
      expect(user?.dashboard_layout.projects).toEqual([])
      expect(user?.dashboard_layout.__appearance).toEqual(saved)
    })
    it('rejects stale and concurrent global saves', async () => {
      await expect(
        invoke(appearanceRoutes.saveAppearance, accounts[0]!, {
          appearance: {},
          expected_revision: 0
        })
      ).rejects.toThrow('changed elsewhere')
      const outcomes = await Promise.allSettled(
        [1, 2].map(value =>
          invoke(appearanceRoutes.saveAppearance, accounts[0]!, {
            appearance: { radius: value },
            expected_revision: 1
          })
        )
      )
      expect(
        outcomes.filter(result => result.status === 'fulfilled')
      ).toHaveLength(1)
      expect(
        outcomes.filter(result => result.status === 'rejected')
      ).toHaveLength(1)
    })
    it('permits editors, rejects viewers, and retains sidebar metadata', async () => {
      const query = { workspace_id: spaces[0]! }
      const body = {
        scope: 'workspace',
        appearance: { icon: 'ph:star-fill', accent: '#486346' },
        expected_revision: 0
      }
      await expect(
        invoke(workspaceRoutes.saveAppearance, accounts[2]!, body, query)
      ).rejects.toThrow('read-only')
      const saved = await invoke<WorkspaceNavigation>(
        workspaceRoutes.saveAppearance,
        accounts[1]!,
        body,
        query
      )
      expect(saved).toMatchObject({
        ...initialNavigation,
        revision: 1,
        appearance: body.appearance
      })
      await expect(
        invoke(workspaceRoutes.saveAppearance, accounts[0]!, body, query)
      ).rejects.toThrow('changed elsewhere')
    })
    it('styles a page without rewriting its editor body or other workspaces', async () => {
      const query = { workspace_id: spaces[0]! }
      const override = {
        icon: 'ri:file-text-fill',
        cover: { type: 'color', value: '#445566' },
        font: { provider: 'system', family: 'serif' }
      }
      const saved = await invoke<WorkspaceNavigation>(
        workspaceRoutes.saveAppearance,
        accounts[0]!,
        {
          scope: 'page',
          key: '/page/' + pageId,
          appearance: override,
          expected_revision: 1
        },
        query
      )
      expect(saved.pageAppearance?.['/page/' + pageId]).toEqual(override)
      expect(saved.appearance?.accent).toBe('#486346')
      const [unchanged] =
        await admin`select body,revision from zillion_databases__workspace_pages where id=${pageId}`
      expect(unchanged?.body).toEqual(page)
      expect(unchanged?.revision).toBe(1)
      const other = await invoke<WorkspaceNavigation>(
        workspaceRoutes.navigation,
        accounts[0]!,
        undefined,
        { workspace_id: spaces[1]! }
      )
      expect(other.pageAppearance).toBeUndefined()
      await expect(
        invoke(
          workspaceRoutes.saveAppearance,
          accounts[0]!,
          {
            scope: 'page',
            key: '/page/' + otherPageId,
            appearance: override,
            expected_revision: 2
          },
          query
        )
      ).rejects.toThrow('not found in this workspace')
      const reset = await invoke<WorkspaceNavigation>(
        workspaceRoutes.saveAppearance,
        accounts[0]!,
        {
          scope: 'page',
          key: '/page/' + pageId,
          appearance: {},
          expected_revision: 2
        },
        query
      )
      expect(reset.pageAppearance?.['/page/' + pageId]).toBeUndefined()
    })
    it('preserves appearance when navigation changes', async () => {
      const query = { workspace_id: spaces[0]! }
      const navigation = await invoke<WorkspaceNavigation>(
        workspaceRoutes.navigation,
        accounts[0]!,
        undefined,
        query
      )
      const saved = await invoke<WorkspaceNavigation>(
        workspaceRoutes.saveNavigation,
        accounts[0]!,
      { revision: navigation.revision, groups: navigation.groups, items: [] },
        query
      )
      expect(saved.appearance).toEqual(navigation.appearance)
      expect(saved.revision).toBe(navigation.revision + 1)
    })
  }
)
