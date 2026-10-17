import { ClientError } from '@monolith/server-utils'
import { eq, sql } from 'drizzle-orm'
import z from 'zod'

import {
  type MarketQuote,
  habitCommand,
  habitSchema,
  quoteSchema
} from '../widgetShared'
import endpoints from './endpoints'
import { ownerId } from './model'
import { workspaceHabits } from './schema.drizzle'
import { withWorkspaceOwner, workspaceAccess } from './workspaceStore'

const scope = z.object({ workspace_id: z.string().uuid() })
export const habits = endpoints
  .query({
    description: 'Read workspace habits',
    input: { query: scope },
    output: { OK: habitSchema }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [row] = await db
        .select()
        .from(workspaceHabits)
        .where(eq(workspaceHabits.workspace_id, workspace.id))
      return response.ok(row?.state ?? { revision: 0, habits: [] })
    })
  })
export const updateHabits = endpoints
  .mutation({
    description: 'Create or check a habit without losing concurrent edits',
    input: {
      query: scope,
      body: z.object({
        expected_revision: z.number().int().nonnegative(),
        command: habitCommand
      })
    },
    output: { OK: habitSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':habits'},0))`
    )
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [row] = await db
        .select()
        .from(workspaceHabits)
        .where(eq(workspaceHabits.workspace_id, workspace.id))
      const state = structuredClone(row?.state ?? { revision: 0, habits: [] })
      if (state.revision !== body.expected_revision)
        throw new ClientError(
          'Habits changed elsewhere. Refresh and try again.',
          409
        )
      const command = body.command
      if (command.type === 'create') {
        if (state.habits.length >= 200)
          throw new ClientError('The workspace supports up to 200 habits', 400)
        if (!state.habits.some(h => h.id === command.id))
          state.habits.push({
            id: command.id,
            title: command.title,
            archived: false,
            days: []
          })
      } else {
        const habit = state.habits.find(h => h.id === command.id)
        if (!habit) throw new ClientError('Habit not found', 404)
        if (command.type === 'archive') habit.archived = command.archived
        else {
          const parsed = new Date(`${command.day}T12:00:00Z`)
          if (
            Number.isNaN(+parsed) ||
            parsed.toISOString().slice(0, 10) !== command.day ||
            command.day > new Date(Date.now() + 14 * 3600000).toISOString().slice(0, 10) ||
            Date.now() - +parsed > 370 * 86400000
          )
            throw new ClientError(
              'Choose a valid day within the last year',
              400
            )
          habit.days = command.checked
            ? [...new Set([...habit.days, command.day])].sort()
            : habit.days.filter(day => day !== command.day)
        }
      }
      state.revision++
      await db
        .insert(workspaceHabits)
        .values({
          workspace_id: workspace.id,
          owner_id: workspace.owner_id,
          state
        })
        .onConflictDoUpdate({
          target: workspaceHabits.workspace_id,
          set: { state }
        })
      return response.ok(state)
    })
  })

const cache = new Map<string, { until: number; quotes: MarketQuote[] }>()
async function json(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(9000),
    redirect: 'error'
  })
  if (!response.ok) throw Error(`Market provider returned ${response.status}`)
  return response.json()
}
export const quotes = endpoints
  .query({
    description:
      'Read timestamped market quotes using keys from the account vault',
    input: {
      query: scope.extend({
        stocks: z
          .string()
          .max(120)
          .regex(/^[A-Za-z0-9.,: -]*$/)
          .default(''),
        coins: z
          .string()
          .max(200)
          .regex(/^[a-z0-9, -]*$/)
          .default('bitcoin,ethereum')
      })
    },
    output: { OK: z.array(quoteSchema) }
  })
  .callback(async ({ db, res, query, response, core: { api } }) => {
    const actor = ownerId(res)
    await workspaceAccess(db, actor, query.workspace_id)
    const stocks = [
      ...new Set(
        query.stocks
          .split(',')
          .map(s => s.trim().toUpperCase())
          .filter(Boolean)
      )
    ].slice(0, 5)
    const coins = [
      ...new Set(
        query.coins
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
    ].slice(0, 5)
    const key = `${actor}:${stocks.join(',')}:${coins.join(',')}`,
      existing = cache.get(key)
    if (existing && existing.until > Date.now())
      return response.ok(existing.quotes)
    const result: MarketQuote[] = []
    if (coins.length) {
      let apiKey = ''
      try {
        apiKey = await api.getAPIKey('coingecko')
      } catch {
        /* Public endpoint remains usable where supported. */
      }
      try {
        const data = await json(
          `https://api.coingecko.com/api/v3/simple/price?${new URLSearchParams({ ids: coins.join(','), vs_currencies: 'usd', include_24hr_change: 'true', include_last_updated_at: 'true' })}`,
          apiKey ? { 'x-cg-demo-api-key': apiKey } : {}
        )
        for (const symbol of coins) {
          const value = data[symbol]
          result.push({
            symbol,
            source: 'CoinGecko',
            price: Number.isFinite(value?.usd) ? value.usd : null,
            change: Number.isFinite(value?.usd_24h_change)
              ? value.usd_24h_change
              : null,
            at: Number.isFinite(value?.last_updated_at)
              ? value.last_updated_at
              : null,
            error: Number.isFinite(value?.usd) ? null : 'unavailable'
          })
        }
      } catch {
        result.push(
          ...coins.map(symbol => ({
            symbol,
            source: 'CoinGecko' as const,
            price: null,
            change: null,
            at: null,
            error: apiKey ? 'unavailable' : 'coingeckoKey'
          }))
        )
      }
    }
    if (stocks.length) {
      let apiKey = ''
      try {
        apiKey = await api.getAPIKey('finnhub')
      } catch {
        /* The UI offers the vault setup path. */
      }
      result.push(
        ...(await Promise.all(
          stocks.map(async symbol => {
            const empty: MarketQuote = {
              symbol,
              source: 'Finnhub',
              price: null,
              change: null,
              at: null,
              error: 'finnhubKey'
            }
            if (!apiKey) return empty
            try {
              const data = await json(
                `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`,
                { 'X-Finnhub-Token': apiKey }
              )
              if (
                !Number.isFinite(data.c) ||
                data.c <= 0 ||
                !Number.isFinite(data.t) ||
                data.t <= 0
              )
                return { ...empty, error: 'unavailable' }
              return {
                symbol,
                source: 'Finnhub' as const,
                price: data.c,
                change: Number.isFinite(data.dp) ? data.dp : null,
                at: data.t,
                error: null
              }
            } catch {
              return { ...empty, error: 'unavailable' }
            }
          })
        ))
      )
    }
    for (const [key, entry] of cache)
      if (entry.until < Date.now()) cache.delete(key)
    if (cache.size >= 500) cache.delete(cache.keys().next().value!)
    cache.set(key, { until: Date.now() + 60000, quotes: result })
    return response.ok(result)
  })
