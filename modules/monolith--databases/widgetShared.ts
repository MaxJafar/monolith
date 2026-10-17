import z from 'zod'

export const habitSchema = z.object({
  revision: z.number().int().nonnegative(),
  habits: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(1).max(100),
      archived: z.boolean(),
      days: z.array(z.string())
    })
  )
})
export type HabitState = z.infer<typeof habitSchema>
export const habitCommand = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create'),
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(100)
  }),
  z.object({
    type: z.literal('check'),
    id: z.string().uuid(),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checked: z.boolean()
  }),
  z.object({
    type: z.literal('archive'),
    id: z.string().uuid(),
    archived: z.boolean()
  })
])
export const quoteSchema = z.object({
  symbol: z.string(),
  source: z.enum(['Finnhub', 'CoinGecko']),
  price: z.number().nullable(),
  change: z.number().nullable(),
  at: z.number().nullable(),
  error: z.string().nullable()
})
export type MarketQuote = z.infer<typeof quoteSchema>

export function widgetConfig(value = ''): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
      return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'string')
    )
  } catch {
    return {}
  }
}
