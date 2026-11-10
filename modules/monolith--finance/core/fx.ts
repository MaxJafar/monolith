import { decimalsOf } from './currencies'
import { type Dec, div, isPositive, mul, round } from './money'

/** Rates keep twelve fraction digits: exact enough for satoshis and lira. */
export const RATE_DECIMALS = 12

export type RateSource = 'base' | 'custom' | 'market' | 'missing'

export type RateEntry = {
  code: string
  /** Units of the base currency for one unit of `code`. */
  rate: Dec | null
  source: RateSource
  /** The market rate against the base, whether or not a custom rate wins. */
  market: Dec | null
  custom: Dec | null
  market_at: string | null
}

export type RateBook = {
  base: string
  entries: Record<string, RateEntry>
}

export type StoredRate = {
  code: string
  /** Base units per unit, set by the owner. */
  custom_rate: Dec | null
  /** Crypto quotes: US dollars per unit. */
  market_usd: Dec | null
  /** Fiat quotes: units per US dollar, as central banks publish them. */
  market_per_usd: Dec | null
  market_at: string | null
}

/** A market quote as the exact fraction numerator / denominator USD per unit. */
function usdFraction(
  code: string,
  row: StoredRate | undefined
): [Dec, Dec] | null {
  if (code === 'USD') return ['1', '1']
  if (row?.market_usd && isPositive(row.market_usd))
    return [row.market_usd, '1']
  if (row?.market_per_usd && isPositive(row.market_per_usd))
    return ['1', row.market_per_usd]

  return null
}

/**
 * Resolve each currency to one effective rate against the base: the base
 * itself is 1, an owner's custom rate wins, then the market rate. Market
 * quotes stay in the provider's own direction and are divided once, so a
 * published 1.7 AZN per USD stays exactly 1.7 whichever currency is the base.
 */
export function buildRateBook(
  base: string,
  codes: readonly string[],
  stored: readonly StoredRate[]
): RateBook {
  const byCode = new Map(stored.map(item => [item.code, item]))
  const baseQuote = usdFraction(base, byCode.get(base))
  const entries: Record<string, RateEntry> = {}

  for (const code of new Set([base, ...codes])) {
    const row = byCode.get(code)
    const quote = usdFraction(code, row)
    const market =
      code === base
        ? '1'
        : quote && baseQuote
          ? div(
              mul(quote[0], baseQuote[1]),
              mul(quote[1], baseQuote[0]),
              RATE_DECIMALS
            )
          : null
    const custom =
      code !== base && row?.custom_rate && isPositive(row.custom_rate)
        ? row.custom_rate
        : null
    const rate = code === base ? '1' : (custom ?? market)

    entries[code] = {
      code,
      rate,
      source:
        code === base
          ? 'base'
          : custom
            ? 'custom'
            : market
              ? 'market'
              : 'missing',
      market,
      custom,
      market_at: row?.market_at ?? null
    }
  }

  return { base, entries }
}

export function rateOf(book: RateBook, code: string): Dec | null {
  if (code === book.base) return '1'

  return book.entries[code]?.rate ?? null
}

/** Units of `to` for one unit of `from`. */
export function crossRate(
  book: RateBook,
  from: string,
  to: string
): Dec | null {
  if (from === to) return '1'

  const source = rateOf(book, from)
  const target = rateOf(book, to)

  if (!source || !target || !isPositive(target)) return null

  return div(source, target, RATE_DECIMALS)
}

/**
 * Convert with one rounding step: the exact product of the amount and the
 * source rate is divided by the target rate and rounded to the target's
 * precision.
 */
export function convert(
  book: RateBook,
  amount: Dec,
  from: string,
  to: string,
  decimals = decimalsOf(to)
): Dec | null {
  if (from === to) return round(amount, decimals)

  const source = rateOf(book, from)
  const target = rateOf(book, to)

  if (!source || !target || !isPositive(target)) return null

  return div(mul(amount, source), target, decimals)
}

export const toBase = (book: RateBook, amount: Dec, code: string) =>
  convert(book, amount, code, book.base)

/**
 * Re-express custom rates against a new base, keeping what each pair means:
 * 1 USD = 1.7 AZN with AZN as base becomes 1 AZN = 0.588… USD with USD as base.
 */
export function reexpressCustomRates(
  book: RateBook,
  nextBase: string
): Record<string, Dec | null> {
  const pivot = rateOf(book, nextBase)
  const result: Record<string, Dec | null> = {}

  for (const entry of Object.values(book.entries)) {
    if (entry.code === nextBase) {
      result[entry.code] = null
      continue
    }

    const effective = entry.code === book.base ? '1' : entry.custom

    result[entry.code] =
      effective && pivot && isPositive(pivot)
        ? div(effective, pivot, RATE_DECIMALS)
        : null
  }

  // The previous base keeps a pinned rate only if the owner had pinned the new
  // base: otherwise it reverts to market data.
  if (book.base !== nextBase && !book.entries[nextBase]?.custom)
    result[book.base] = null

  return result
}
