import { describe, expect, it } from 'vitest'

import { computeTransaction, computeWish } from './compute'
import { buildRateBook, convert, crossRate, reexpressCustomRates } from './fx'

const stored = [
  {
    code: 'AZN',
    custom_rate: null,
    market_usd: null,
    market_per_usd: '1.7',
    market_at: '2026-11-10T00:00:00.000Z'
  },
  {
    code: 'EUR',
    custom_rate: null,
    market_usd: null,
    market_per_usd: '0.85',
    market_at: '2026-11-10T00:00:00.000Z'
  },
  {
    code: 'BTC',
    custom_rate: null,
    market_usd: '65000',
    market_per_usd: null,
    market_at: '2026-11-10T00:00:00.000Z'
  }
]

describe('rate book', () => {
  it('keeps published quotes exact against any base', () => {
    const book = buildRateBook('AZN', ['USD', 'EUR', 'BTC'], stored)

    expect(book.entries.USD!.rate).toBe('1.7')
    expect(book.entries.EUR!.rate).toBe('2')
    expect(book.entries.BTC!.rate).toBe('110500')
    expect(book.entries.AZN!.source).toBe('base')
  })

  it('lets a custom rate win over the market', () => {
    const book = buildRateBook(
      'AZN',
      ['USD'],
      [
        ...stored.filter(row => row.code !== 'USD'),
        {
          ...stored[0]!,
          code: 'USD',
          market_per_usd: null,
          custom_rate: '1.72'
        }
      ]
    )

    expect(book.entries.USD).toMatchObject({
      rate: '1.72',
      source: 'custom',
      market: '1.7'
    })
  })

  it('reports a missing rate instead of guessing', () => {
    const book = buildRateBook('AZN', ['GEL'], stored)

    expect(book.entries.GEL).toMatchObject({ rate: null, source: 'missing' })
    expect(convert(book, '10', 'GEL', 'AZN')).toBeNull()
  })

  it('converts with one rounding step', () => {
    const book = buildRateBook('AZN', ['USD', 'EUR'], stored)

    expect(convert(book, '100', 'USD', 'AZN')).toBe('170')
    expect(convert(book, '100', 'AZN', 'USD')).toBe('58.82')
    expect(convert(book, '10', 'EUR', 'USD')).toBe('11.76')
    expect(crossRate(book, 'EUR', 'USD')).toBe('1.176470588235')
  })

  it('re-expresses pinned rates when the base changes', () => {
    const book = buildRateBook(
      'AZN',
      ['USD', 'EUR'],
      [
        { ...stored[0]! },
        {
          code: 'USD',
          custom_rate: '1.7',
          market_usd: null,
          market_per_usd: null,
          market_at: null
        },
        {
          code: 'EUR',
          custom_rate: '2',
          market_usd: null,
          market_per_usd: null,
          market_at: null
        }
      ]
    )
    const next = reexpressCustomRates(book, 'USD')

    expect(next.USD).toBeNull()
    expect(next.EUR).toBe('1.176470588235')
    expect(next.AZN).toBe('0.588235294118')
  })
})

describe('transactions', () => {
  const book = buildRateBook('AZN', ['USD'], stored)
  const vat = {
    kind: 'vat' as const,
    rate: '18',
    inclusive: false,
    withheld: false,
    components: []
  }

  it('books a USD subscription with VAT on top into an AZN base', () => {
    const result = computeTransaction(
      {
        kind: 'expense',
        entered_amount: '20',
        entered_currency: 'USD',
        account_currency: 'USD',
        tax_basis: 'net',
        rule: vat
      },
      book
    )

    expect(result).toMatchObject({
      amount: '23.6',
      tax_amount: '3.6',
      base_rate: '1.7',
      base_amount: '40.12',
      base_tax: '6.12',
      base_net: '34'
    })
  })

  it('converts a foreign price into the paying account currency', () => {
    const result = computeTransaction(
      {
        kind: 'expense',
        entered_amount: '100',
        entered_currency: 'USD',
        account_currency: 'AZN',
        tax_basis: 'gross',
        rule: null
      },
      book
    )

    expect(result).toMatchObject({ amount: '170', base_amount: '170' })
  })

  it('credits withheld salary at net and a VÖEN invoice at gross', () => {
    const components = [
      { label: 'Tax', brackets: [{ up_to: null, rate: '2' }] }
    ]
    const invoice = computeTransaction(
      {
        kind: 'income',
        entered_amount: '1000',
        entered_currency: 'AZN',
        account_currency: 'AZN',
        tax_basis: 'gross',
        rule: {
          kind: 'income',
          rate: '0',
          inclusive: false,
          withheld: false,
          components
        }
      },
      book
    )
    const payslip = computeTransaction(
      {
        kind: 'income',
        entered_amount: '1000',
        entered_currency: 'AZN',
        account_currency: 'AZN',
        tax_basis: 'gross',
        rule: {
          kind: 'income',
          rate: '0',
          inclusive: false,
          withheld: true,
          components
        }
      },
      book
    )

    expect(invoice).toMatchObject({
      amount: '1000',
      base_tax: '20',
      withheld: false
    })
    expect(payslip).toMatchObject({
      amount: '980',
      base_amount: '980',
      withheld: true
    })
  })

  it('moves the converted amount in a cross-currency transfer', () => {
    const result = computeTransaction(
      {
        kind: 'transfer',
        entered_amount: '170',
        entered_currency: 'AZN',
        account_currency: 'AZN',
        to_account_currency: 'USD',
        tax_basis: 'gross',
        rule: null
      },
      book
    )

    expect(result).toMatchObject({ amount: '170', to_amount: '100' })
  })
})

describe('wishlist pricing', () => {
  it('totals price × quantity + shipping with VAT on top', () => {
    const book = buildRateBook('AZN', ['USD'], stored)
    const totals = computeWish(
      {
        price: '45',
        quantity: 2,
        shipping: '10',
        currency: 'USD',
        rule: {
          kind: 'vat',
          rate: '18',
          inclusive: false,
          withheld: false,
          components: []
        }
      },
      book
    )

    expect(totals).toEqual({
      subtotal: '100',
      tax: '18',
      total: '118',
      base_total: '200.6'
    })
  })
})
