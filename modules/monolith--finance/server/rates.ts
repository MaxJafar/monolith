import { currencyInfo } from '../core/currencies'
import { type Dec, round } from '../core/money'

/** Daily reference rates for ~160 currencies, quoted as units per US dollar. */
const FIAT_URL = 'https://open.er-api.com/v6/latest/USD'
const CRYPTO_URL = 'https://api.coingecko.com/api/v3/simple/price'
const TTL = 30 * 60 * 1000

export type MarketQuote = {
  code: string
  /** Crypto: US dollars per unit. */
  usd: Dec | null
  /** Fiat: units per US dollar. */
  per_usd: Dec | null
  at: Date
}

const cache = new Map<string, { until: number; value: unknown }>()

async function json(url: string, headers: Record<string, string> = {}) {
  const hit = cache.get(url)

  if (hit && hit.until > Date.now()) return hit.value

  const response = await fetch(url, {
    headers: { accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(9000),
    redirect: 'error'
  })

  if (!response.ok) throw new Error(`Rate provider returned ${response.status}`)

  const value = await response.json()

  cache.set(url, { until: Date.now() + TTL, value })

  return value
}

/** Write a provider number as a plain decimal, never in exponent form. */
export function decimalFromNumber(value: unknown): Dec | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return null

  const text = round(
    value.toLocaleString('en-US', {
      useGrouping: false,
      maximumSignificantDigits: 15
    }),
    12
  )

  return text === '0' ? null : text
}

/**
 * Fetch market quotes for the requested codes. Fiat comes from one daily
 * reference table, crypto from CoinGecko. Failures are reported per code so
 * the owner can pin a custom rate instead.
 */
export async function fetchMarketQuotes(
  codes: readonly string[],
  coingeckoKey = ''
): Promise<{ quotes: MarketQuote[]; failed: string[] }> {
  const fiat = codes.filter(
    code => code !== 'USD' && !currencyInfo(code).crypto
  )
  const crypto = codes.filter(code => currencyInfo(code).crypto)
  const quotes: MarketQuote[] = []
  const failed: string[] = []

  if (fiat.length)
    try {
      const data = (await json(FIAT_URL)) as {
        result?: string
        rates?: Record<string, unknown>
        time_last_update_unix?: number
      }
      const at =
        typeof data.time_last_update_unix === 'number'
          ? new Date(data.time_last_update_unix * 1000)
          : new Date()

      for (const code of fiat) {
        const perUsd = decimalFromNumber(data.rates?.[code])

        if (perUsd) quotes.push({ code, usd: null, per_usd: perUsd, at })
        else failed.push(code)
      }
    } catch {
      failed.push(...fiat)
    }

  if (crypto.length) {
    const ids = crypto.map(code => currencyInfo(code).coingecko!)

    try {
      const data = (await json(
        `${CRYPTO_URL}?${new URLSearchParams({
          ids: ids.join(','),
          vs_currencies: 'usd',
          include_last_updated_at: 'true'
        })}`,
        coingeckoKey ? { 'x-cg-demo-api-key': coingeckoKey } : {}
      )) as Record<string, { usd?: unknown; last_updated_at?: unknown }>

      crypto.forEach((code, index) => {
        const entry = data[ids[index]!]
        const usd = decimalFromNumber(entry?.usd)

        if (!usd) return void failed.push(code)
        quotes.push({
          code,
          usd,
          per_usd: null,
          at:
            typeof entry?.last_updated_at === 'number'
              ? new Date(entry.last_updated_at * 1000)
              : new Date()
        })
      })
    } catch {
      failed.push(...crypto)
    }
  }

  return { quotes, failed }
}
