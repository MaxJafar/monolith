import { decimalsOf } from './currencies'
import { type RateBook, convert, crossRate } from './fx'
import { type Dec, add, isZero, mul, mulRound, round, sub } from './money'
import { type TaxBasis, type TaxRuleCore, applyTax } from './tax'

export type TransactionKind = 'income' | 'expense' | 'transfer'

export type TransactionDraft = {
  kind: TransactionKind
  /** The amount as typed, in `entered_currency`. */
  entered_amount: Dec
  entered_currency: string
  account_currency: string
  to_account_currency?: string | null
  /** For transfers between currencies: what arrived, if known. */
  to_amount?: Dec | null
  tax_basis: TaxBasis
  rule: TaxRuleCore | null
}

export type ComputedTransaction = {
  /** What moved in the account, in its currency. */
  amount: Dec
  gross_amount: Dec
  tax_amount: Dec
  net_amount: Dec
  /** Transfers: what arrived in the destination account's currency. */
  to_amount: Dec | null
  /** Base units per account unit at booking time. */
  base_rate: Dec
  base_amount: Dec
  base_gross: Dec
  base_tax: Dec
  base_net: Dec
  /** The rule withheld income tax at source. */
  withheld: boolean
  parts: { label: string; tax: Dec }[]
}

export class MissingRateError extends Error {
  constructor(readonly code: string) {
    super(`No exchange rate for ${code}. Add a custom rate or refresh rates.`)
  }
}

function requireConvert(
  book: RateBook,
  amount: Dec,
  from: string,
  to: string
): Dec {
  const value = convert(book, amount, from, to)

  if (value === null) throw new MissingRateError(from === to ? to : from)

  return value
}

/**
 * Turn a draft into the amounts stored for a transaction. Flows keep their
 * booking-time rate, so later rate changes never rewrite history; the base
 * net is derived as gross − tax so the three always reconcile exactly.
 */
export function computeTransaction(
  draft: TransactionDraft,
  book: RateBook
): ComputedTransaction {
  const decimals = decimalsOf(draft.account_currency)
  const baseDecimals = decimalsOf(book.base)
  const entered = requireConvert(
    book,
    draft.entered_amount,
    draft.entered_currency,
    draft.account_currency
  )
  const rate = crossRate(book, draft.account_currency, book.base)

  if (rate === null) throw new MissingRateError(draft.account_currency)

  if (draft.kind === 'transfer') {
    const target = draft.to_account_currency ?? draft.account_currency
    const arrived =
      draft.to_amount && !isZero(draft.to_amount)
        ? round(draft.to_amount, decimalsOf(target))
        : requireConvert(book, entered, draft.account_currency, target)
    const base = mulRound(entered, rate, baseDecimals)

    return {
      amount: entered,
      gross_amount: entered,
      tax_amount: '0',
      net_amount: entered,
      to_amount: arrived,
      base_rate: rate,
      base_amount: base,
      base_gross: base,
      base_tax: '0',
      base_net: base,
      withheld: false,
      parts: []
    }
  }

  const rule = draft.rule
  const split = applyTax(entered, draft.tax_basis, rule, decimals)
  const withheld =
    draft.kind === 'income' && rule?.kind === 'income' && rule.withheld
  const amount = withheld ? split.net : split.gross
  const baseGross = mulRound(split.gross, rate, baseDecimals)
  const baseTax = mulRound(split.tax, rate, baseDecimals)
  const baseNet = sub(baseGross, baseTax)

  return {
    amount,
    gross_amount: split.gross,
    tax_amount: split.tax,
    net_amount: split.net,
    to_amount: null,
    base_rate: rate,
    base_amount: withheld ? baseNet : baseGross,
    base_gross: baseGross,
    base_tax: baseTax,
    base_net: baseNet,
    withheld,
    parts: split.parts
  }
}

export type WishPricing = {
  price: Dec
  quantity: number
  shipping: Dec
  currency: string
  rule: TaxRuleCore | null
}

export type WishTotals = {
  subtotal: Dec
  tax: Dec
  total: Dec
  /** In the base currency at today's effective rate, or null without one. */
  base_total: Dec | null
}

/** Price × quantity + shipping, then the item's VAT or customs rule. */
export function computeWish(item: WishPricing, book: RateBook): WishTotals {
  const decimals = decimalsOf(item.currency)
  const subtotal = round(
    add(mul(item.price, String(item.quantity)), item.shipping),
    decimals
  )
  const rule = item.rule?.kind === 'vat' ? item.rule : null
  const split = applyTax(
    subtotal,
    rule?.inclusive ? 'gross' : 'net',
    rule,
    decimals
  )

  return {
    subtotal,
    tax: split.tax,
    total: split.gross,
    base_total: convert(book, split.gross, item.currency, book.base)
  }
}
