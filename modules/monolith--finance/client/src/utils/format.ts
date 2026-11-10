import { currencyInfo } from '../../../core/currencies'
import { type Dec, toNumber } from '../../../core/money'

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(locale: string, options: Intl.NumberFormatOptions) {
  const key = locale + JSON.stringify(options)

  let value = formatters.get(key)

  if (!value) {
    try {
      value = new Intl.NumberFormat(locale, options)
    } catch {
      value = new Intl.NumberFormat('en', { ...options, style: 'decimal' })
    }
    formatters.set(key, value)
  }

  return value
}

export type MoneyFormat = {
  /** 12.9K instead of 12,900.00 — for axes and dense tiles. */
  compact?: boolean
  /** Always show + or − (for flows). */
  sign?: boolean
  /** Drop fraction digits when the value is whole. */
  trim?: boolean
}

const isIsoFiat = (code: string) =>
  !currencyInfo(code).crypto && /^[A-Z]{3}$/.test(code)

/**
 * Display a decimal string in a currency. Formatting is the only place a
 * value becomes a JavaScript number, and only for presentation.
 */
export function formatMoney(
  value: Dec | null | undefined,
  code: string,
  locale: string,
  { compact = false, sign = false, trim = false }: MoneyFormat = {}
): string {
  if (value === null || value === undefined) return '—'

  const info = currencyInfo(code)
  const number = toNumber(value)
  const whole = trim && Number.isInteger(number)
  const magnitude = Math.abs(number)
  // Compact figures drop cents once they stop mattering: 318, 12.9K, 4.2M.
  const digits = compact
    ? magnitude >= 10000
      ? 1
      : magnitude >= 100
        ? 0
        : info.decimals
    : info.decimals
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: compact || whole ? 0 : Math.min(info.decimals, 2),
    maximumFractionDigits: whole ? 0 : digits,
    notation: compact && magnitude >= 10000 ? 'compact' : 'standard',
    signDisplay: sign ? 'exceptZero' : 'auto'
  }

  if (isIsoFiat(code))
    return formatter(locale, {
      ...options,
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol'
    }).format(number)

  return `${formatter(locale, options).format(number)} ${info.symbol}`
}

export function formatPercent(
  value: number,
  locale: string,
  digits = 0
): string {
  if (!Number.isFinite(value)) return '—'

  return formatter(locale, {
    style: 'percent',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value)
}

export function formatNumber(value: number, locale: string, digits = 2) {
  return formatter(locale, { maximumFractionDigits: digits }).format(value)
}

/** The rate as typed in a bank: up to six significant fraction digits. */
export function formatRate(value: Dec | null, locale: string) {
  if (value === null) return '—'

  const number = toNumber(value)

  return formatter(locale, {
    maximumSignificantDigits: number >= 1 ? undefined : 6,
    maximumFractionDigits: number >= 1 ? 6 : undefined
  }).format(number)
}

export function formatDate(
  date: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
) {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number
  ]

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatInstant(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
