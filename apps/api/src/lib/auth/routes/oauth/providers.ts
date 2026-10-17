import { encrypt } from '@functions/auth/encryption'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  OAUTH_PROVIDER_CONFIGS,
  oauthProvider
} from '../../constants/oauth_providers'
import endpoints from '../../endpoints'
import { authOAuthProviders as providers } from '../../schema.drizzle'

const identity = z.object({ id: z.string().min(1) })
const providerLabel = z.object({
  provider: z.string(),
  icon: z.string(),
  name: z.string()
})
const label = (provider: string) => {
  const metadata = oauthProvider(provider)!
  return { provider, icon: metadata.icon, name: metadata.name }
}

export const listEnabled = endpoints
  .query({
    description: 'Read configured sign-in choices',
    noAuth: true,
    encrypted: false,
    output: { OK: z.array(providerLabel) }
  })
  .callback(async ({ db, response }) => {
    const rows = await db.query.authOAuthProviders.findMany({
      where: { enabled: true }
    })
    return response.ok(
      rows
        .filter(
          row =>
            row.client_id && row.client_secret && oauthProvider(row.provider)
        )
        .map(row => label(row.provider))
    )
  })

export const listOptions = endpoints
  .query({
    description: 'Read sign-in provider settings without credentials',
    output: {
      OK: z.array(
        providerLabel.extend({
          id: z.string().nullable(),
          configured: z.boolean(),
          enabled: z.boolean(),
          updated: z.date().nullable()
        })
      )
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db.query.authOAuthProviders.findMany()
    const saved = new Map(rows.map(row => [row.provider, row]))
    return response.ok(
      Object.keys(OAUTH_PROVIDER_CONFIGS).map(provider => {
        const row = saved.get(provider)
        return {
          ...label(provider),
          id: row?.id ?? null,
          configured: !!(row?.client_id && row.client_secret),
          enabled: row?.enabled ?? false,
          updated: row?.updated ?? null
        }
      })
    )
  })

export const upsert = endpoints
  .mutation({
    description: 'Save sign-in provider credentials',
    input: {
      query: z.object({ provider: z.string() }),
      body: z.object({
        clientId: z.string().max(255),
        clientSecret: z.string().max(255)
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, body, response }) => {
    if (!oauthProvider(query.provider))
      return response.badRequest('Unsupported provider')
    const masterKey = process.env.MASTER_KEY
    if (!masterKey) throw new Error('MASTER_KEY must be configured')
    const previous = await db.query.authOAuthProviders.findFirst({
      where: { provider: query.provider }
    })
    const seal = (value: string) =>
      encrypt(Buffer.from(value), masterKey).toString('base64')
    const client_id = body.clientId ? seal(body.clientId) : previous?.client_id
    const client_secret = body.clientSecret
      ? seal(body.clientSecret)
      : previous?.client_secret
    if (!client_id || !client_secret)
      return response.badRequest('Client ID and secret are required')
    await db
      .insert(providers)
      .values({
        provider: query.provider,
        client_id,
        client_secret,
        enabled: true
      })
      .onConflictDoUpdate({
        target: providers.provider,
        set: { client_id, client_secret, enabled: true, updated: new Date() }
      })
    return response.noContent()
  })

export const toggle = endpoints
  .mutation({
    description: 'Enable or disable a configured sign-in provider',
    input: { query: identity },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, response }) => {
    const row = await db.query.authOAuthProviders.findFirst({
      where: { id: query.id }
    })
    if (!row) return response.notFound()
    if (
      !row.enabled &&
      (!row.client_id || !row.client_secret || !oauthProvider(row.provider))
    )
      return response.badRequest(
        'Complete provider configuration before enabling it'
      )
    await db
      .update(providers)
      .set({
        enabled: sql`not ${providers.enabled}`,
        updated: new Date()
      })
      .where(eq(providers.id, query.id))
    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Forget a sign-in provider configuration',
    input: { query: identity },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, response }) => {
    const removed = await db
      .delete(providers)
      .where(eq(providers.id, query.id))
      .returning({ id: providers.id })
    return removed.length ? response.noContent() : response.notFound()
  })
