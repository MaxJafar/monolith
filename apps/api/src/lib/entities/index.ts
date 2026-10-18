import { createMonolith, defineRoutes } from '@monolith/server-utils'
import z from 'zod'

import { adapters } from '../search/sources'
import { entityDto, entityKey, isInternalPath } from './model'
import { findEntities } from './registry'

const endpoints = createMonolith({ moduleId: 'entities' })

export const search = endpoints
  .query({
    description:
      'Find authorized core workspace identities for mentions and links',
    input: {
      query: z.object({
        workspace_id: z.uuid(),
        q: z.string().max(100).default('')
      })
    },
    output: { OK: z.array(entityDto) }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(
      await findEntities(db, res.locals.userId, query.workspace_id, query.q)
    )
  )

export const resolve = endpoints
  .mutation({
    description:
      'Resolve live workspace references, returning tombstones for unavailable items',
    input: {
      body: z.object({
        workspace_id: z.uuid(),
        keys: z.array(entityKey).max(100)
      })
    },
    output: { OK: z.array(entityDto) }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(
      await findEntities(
        db,
        res.locals.userId,
        body.workspace_id,
        '',
        body.keys
      )
    )
  )

export const context = endpoints
  .query({
    description: 'Resolve the native item shown at a platform route',
    input: {
      query: z.object({ workspace_id: z.uuid(), path: z.string().max(2000) })
    },
    output: { OK: entityDto.nullable() }
  })
  .callback(async ({ db, res, query, response }) => {
    if (!isInternalPath(query.path)) return response.ok(null)

    const url = new URL(query.path, 'https://monolith.invalid')
    const keys: string[] = []
    const add = (kind: string, id: string | null) => {
      if (id && z.uuid().safeParse(id).success) keys.push(`${kind}:${id}`)
    }

    if (url.pathname.startsWith('/page/')) add('page', url.pathname.slice(6))
    else if (url.pathname === '/redraw')
      add('redraw', url.searchParams.get('project'))
    else if (url.searchParams.has('record'))
      add('record', url.searchParams.get('record'))
    else if (url.pathname === '/databases')
      add('database', url.searchParams.get('base'))

    if (!keys.length)
      for (const adapter of adapters) {
        if (url.pathname === '/' + adapter.module)
          add('native-' + adapter.table, url.searchParams.get('searchItem'))
      }
    if (!keys.length) return response.ok(null)

    const found = await findEntities(
      db,
      res.locals.userId,
      query.workspace_id,
      '',
      keys
    )

    return response.ok(found.find(item => item.available) ?? null)
  })

export default defineRoutes({ search, resolve, context })
