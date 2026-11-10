import {
  type Dec,
  add,
  cmp,
  div,
  isNegative,
  isZero,
  max,
  min,
  mul,
  round,
  sub
} from './money'

/** A marginal rate (percent) on the part of a payment up to `up_to`. */
export type Bracket = { up_to: Dec | null; rate: Dec }

export type TaxComponent = { label: string; brackets: Bracket[] }

export type TaxRuleCore = {
  /** VAT and sales taxes are part of a price; income taxes apply to pay. */
  kind: 'vat' | 'income'
  /** VAT rate in percent. */
  rate: Dec
  /** VAT: a typed price already includes the tax. */
  inclusive: boolean
  /** Income: the payer deducts tax, so the account receives the net. */
  withheld: boolean
  components: TaxComponent[]
}

/** `gross` includes the tax; `net` excludes it. */
export type TaxBasis = 'gross' | 'net'

export type TaxSplit = {
  gross: Dec
  tax: Dec
  net: Dec
  parts: { label: string; tax: Dec }[]
}

const HUNDRED = '100'

export function vatSplit(
  amount: Dec,
  basis: TaxBasis,
  rate: Dec,
  decimals: number
): TaxSplit {
  const value = round(amount, decimals)

  if (isZero(rate)) return { gross: value, net: value, tax: '0', parts: [] }

  if (basis === 'net') {
    const tax = div(mul(value, rate), HUNDRED, decimals)

    return { gross: add(value, tax), net: value, tax, parts: [] }
  }

  const tax = div(mul(value, rate), add(HUNDRED, rate), decimals)

  return { gross: value, net: sub(value, tax), tax, parts: [] }
}

function ordered(brackets: Bracket[]) {
  return [...brackets].sort((a, b) =>
    a.up_to === null ? 1 : b.up_to === null ? -1 : cmp(a.up_to, b.up_to)
  )
}

/** The exact (unrounded) tax of one component on a payment. */
export function componentTax(gross: Dec, component: TaxComponent): Dec {
  let lower = '0'
  let total = '0'

  for (const bracket of ordered(component.brackets)) {
    if (cmp(gross, lower) <= 0) break

    const upper = bracket.up_to === null ? gross : min(gross, bracket.up_to)
    const slice = sub(upper, lower)

    if (!isNegative(slice)) total = add(total, mul(slice, bracket.rate))
    if (bracket.up_to === null) break
    lower = max(lower, bracket.up_to)
  }

  return div(total, HUNDRED, 12)
}

/** Each component is rounded to the currency, then summed. */
export function incomeTax(
  gross: Dec,
  components: TaxComponent[],
  decimals: number
): TaxSplit {
  const value = round(gross, decimals)
  const parts = components.map(component => ({
    label: component.label,
    tax: isNegative(value)
      ? '0'
      : round(componentTax(value, component), decimals)
  }))
  const tax = add('0', ...parts.map(part => part.tax))

  return { gross: value, tax, net: sub(value, tax), parts }
}

/** The marginal rate (percent) that applies just above `point`. */
function marginalAt(point: Dec, components: TaxComponent[]): Dec {
  let total = '0'

  for (const component of components) {
    const bracket = ordered(component.brackets).find(
      item => item.up_to === null || cmp(point, item.up_to) < 0
    )

    if (bracket) total = add(total, bracket.rate)
  }

  return total
}

/**
 * Solve the gross pay that leaves `net` after tax. The schedule is piecewise
 * linear, so each segment between bracket thresholds is solved exactly; the
 * result is rounded to the currency and nudged by one minor unit if rounding
 * made the identity gross − tax = net miss.
 */
export function grossFromNet(
  net: Dec,
  components: TaxComponent[],
  decimals: number
): Dec {
  const target = round(net, decimals)

  if (!components.length || cmp(target, '0') <= 0) return target

  const thresholds = [
    '0',
    ...new Set(
      components.flatMap(component =>
        component.brackets
          .map(bracket => bracket.up_to)
          .filter((value): value is Dec => value !== null)
      )
    )
  ].sort(cmp)
  const exactNet = (gross: Dec) =>
    sub(
      gross,
      add('0', ...components.map(component => componentTax(gross, component)))
    )

  let solved: Dec | null = null

  for (let index = 0; index < thresholds.length; index++) {
    const start = thresholds[index]!
    const next = thresholds[index + 1]
    const rate = marginalAt(start, components)

    if (cmp(rate, HUNDRED) >= 0)
      throw new RangeError(
        'A marginal tax rate of 100% or more has no solution'
      )

    const netAtStart = exactNet(start)

    if (next !== undefined && cmp(target, exactNet(next)) > 0) continue

    const share = div(sub(HUNDRED, rate), HUNDRED, 12)

    solved = add(start, div(sub(target, netAtStart), share, decimals + 4))
    break
  }

  const estimate = round(solved ?? target, decimals)
  const step = div('1', `1${'0'.repeat(decimals)}`, decimals)

  for (const candidate of [estimate, sub(estimate, step), add(estimate, step)])
    if (cmp(incomeTax(candidate, components, decimals).net, target) === 0)
      return candidate

  return estimate
}

/**
 * Split an entered amount into gross, tax and net under a rule. Income
 * entered as `net` is grossed up; the tax is then gross − net exactly.
 */
export function applyTax(
  amount: Dec,
  basis: TaxBasis,
  rule: TaxRuleCore | null,
  decimals: number
): TaxSplit {
  const value = round(amount, decimals)

  if (!rule) return { gross: value, tax: '0', net: value, parts: [] }
  if (rule.kind === 'vat') return vatSplit(value, basis, rule.rate, decimals)
  if (basis === 'gross') return incomeTax(value, rule.components, decimals)

  const gross = grossFromNet(value, rule.components, decimals)
  const split = incomeTax(gross, rule.components, decimals)
  const tax = sub(gross, value)

  return { gross, tax, net: value, parts: split.parts }
}

/** The basis a rule implies when the owner has not chosen one. */
export function defaultBasis(rule: TaxRuleCore | null): TaxBasis {
  if (!rule) return 'gross'
  if (rule.kind === 'vat') return rule.inclusive ? 'gross' : 'net'

  return 'gross'
}

/** A short human summary of a rule's headline rate, e.g. "18%" or "3–14%". */
export function headlineRate(rule: TaxRuleCore): string {
  if (rule.kind === 'vat') return `${rule.rate}%`

  const rates = rule.components.flatMap(component =>
    component.brackets.map(bracket => bracket.rate)
  )

  if (!rates.length) return '0%'

  const low = min(...rates)
  const high = max(...rates)

  return cmp(low, high) === 0 ? `${low}%` : `${low}–${high}%`
}
