/**
 * Exact decimal arithmetic on canonical decimal strings.
 *
 * Money never passes through floating point: every value is parsed into a
 * scaled bigint, combined exactly, and rounded once, half away from zero, at
 * the precision the caller asks for. The client and the server run this same
 * code, so a preview and the stored total always agree.
 */
export type Dec = string

type Parts = { int: bigint; exp: number }

const DECIMAL = /^([+-])?(\d*)(?:\.(\d*))?$/
const powers: bigint[] = [1n]

function pow10(exponent: number): bigint {
  for (let index = powers.length; index <= exponent; index++)
    powers.push(powers[index - 1]! * 10n)

  return powers[exponent]!
}

function parse(value: Dec): Parts {
  const match = DECIMAL.exec(value.trim())

  if (!match || (!match[2] && !match[3]))
    throw new TypeError(`Not a decimal value: ${value}`)

  const fraction = match[3] ?? ''
  const digits = (match[2] || '0') + fraction
  const int = BigInt(digits)

  return { int: match[1] === '-' ? -int : int, exp: fraction.length }
}

function format({ int, exp }: Parts): Dec {
  const negative = int < 0n

  let digits = (negative ? -int : int).toString()

  if (exp > 0) {
    digits = digits.padStart(exp + 1, '0')
    const whole = digits.slice(0, -exp) || '0'
    const fraction = digits.slice(-exp).replace(/0+$/, '')

    digits = fraction ? `${whole}.${fraction}` : whole
  }

  return negative && digits !== '0' ? `-${digits}` : digits
}

function align(a: Parts, b: Parts): [bigint, bigint, number] {
  if (a.exp === b.exp) return [a.int, b.int, a.exp]
  if (a.exp > b.exp) return [a.int, b.int * pow10(a.exp - b.exp), a.exp]

  return [a.int * pow10(b.exp - a.exp), b.int, b.exp]
}

/** Divide two integers, rounding half away from zero. */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError('Division by zero')

  const quotient = numerator / denominator
  const remainder = numerator % denominator

  if (remainder === 0n) return quotient

  const twice = (remainder < 0n ? -remainder : remainder) * 2n
  const magnitude = denominator < 0n ? -denominator : denominator

  if (twice < magnitude) return quotient

  return numerator < 0n !== denominator < 0n ? quotient - 1n : quotient + 1n
}

function roundParts(value: Parts, decimals: number): Parts {
  if (value.exp <= decimals) return value

  return {
    int: divideRounded(value.int, pow10(value.exp - decimals)),
    exp: decimals
  }
}

export function isDec(value: unknown): value is Dec {
  if (typeof value !== 'string') return false

  const match = DECIMAL.exec(value.trim())

  return !!match && !!(match[2] || match[3])
}

/** The canonical form: no exponent, no trailing zeros, no negative zero. */
export function normalize(value: Dec): Dec {
  return format(parse(value))
}

export function add(...values: Dec[]): Dec {
  let total: Parts = { int: 0n, exp: 0 }

  for (const value of values) {
    const [a, b, exp] = align(total, parse(value))

    total = { int: a + b, exp }
  }

  return format(total)
}

export function sum(values: readonly Dec[]): Dec {
  return add(...values)
}

export function sub(a: Dec, b: Dec): Dec {
  const [x, y, exp] = align(parse(a), parse(b))

  return format({ int: x - y, exp })
}

export function neg(value: Dec): Dec {
  const parts = parse(value)

  return format({ int: -parts.int, exp: parts.exp })
}

export function abs(value: Dec): Dec {
  const parts = parse(value)

  return format({
    int: parts.int < 0n ? -parts.int : parts.int,
    exp: parts.exp
  })
}

/** The exact product, with every digit retained. */
export function mul(a: Dec, b: Dec): Dec {
  const x = parse(a)
  const y = parse(b)

  return format({ int: x.int * y.int, exp: x.exp + y.exp })
}

/** The quotient rounded half away from zero to `decimals` places. */
export function div(a: Dec, b: Dec, decimals: number): Dec {
  const x = parse(a)
  const y = parse(b)

  if (y.int === 0n) throw new RangeError('Division by zero')

  const numerator = x.int * pow10(y.exp + decimals)
  const denominator = y.int * pow10(x.exp)

  return format({ int: divideRounded(numerator, denominator), exp: decimals })
}

/** Multiply, then round once: `round(a × b, decimals)`. */
export function mulRound(a: Dec, b: Dec, decimals: number): Dec {
  return round(mul(a, b), decimals)
}

export function round(value: Dec, decimals: number): Dec {
  return format(roundParts(parse(value), decimals))
}

/** A rounded value written with exactly `decimals` fraction digits. */
export function fixed(value: Dec, decimals: number): string {
  const rounded = roundParts(parse(value), decimals)
  const scaled =
    rounded.exp < decimals
      ? rounded.int * pow10(decimals - rounded.exp)
      : rounded.int
  const negative = scaled < 0n
  const digits = (negative ? -scaled : scaled)
    .toString()
    .padStart(decimals + 1, '0')
  const text = decimals
    ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`
    : digits

  return negative && /[1-9]/.test(text) ? `-${text}` : text
}

export function cmp(a: Dec, b: Dec): -1 | 0 | 1 {
  const [x, y] = align(parse(a), parse(b))

  return x === y ? 0 : x < y ? -1 : 1
}

export const isZero = (value: Dec) => parse(value).int === 0n

export const isNegative = (value: Dec) => parse(value).int < 0n

export const isPositive = (value: Dec) => parse(value).int > 0n

export function max(...values: Dec[]): Dec {
  return values.reduce((best, value) => (cmp(value, best) > 0 ? value : best))
}

export function min(...values: Dec[]): Dec {
  return values.reduce((best, value) => (cmp(value, best) < 0 ? value : best))
}

/** The number of fraction digits a value carries in canonical form. */
export function scaleOf(value: Dec): number {
  const canonical = normalize(value)
  const point = canonical.indexOf('.')

  return point === -1 ? 0 : canonical.length - point - 1
}

/** For charts and layout only. Totals stay in decimal strings. */
export function toNumber(value: Dec | null | undefined): number {
  if (value === null || value === undefined) return 0

  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

/** Accept typed input such as "1 234,50" or "1,234.50" as a decimal. */
export function parseInput(text: string): Dec | null {
  let value = text.replace(/[\s\u00a0\u202f'_]/g, '')

  if (!value) return null

  const comma = value.lastIndexOf(',')
  const dot = value.lastIndexOf('.')

  if (comma !== -1 && dot !== -1)
    value =
      comma > dot
        ? value.replace(/\./g, '').replace(',', '.')
        : value.replace(/,/g, '')
  else if (comma !== -1) {
    // One comma before one or two digits is a decimal comma ("12,5");
    // otherwise commas group thousands ("1,234" or "1,234,567").
    const groups = value.split(',')

    value =
      groups.length > 2 || groups[1]!.length === 3
        ? groups.join('')
        : groups.join('.')
  } else if (value.split('.').length > 2) value = value.replace(/\./g, '')

  return isDec(value) ? normalize(value) : null
}
