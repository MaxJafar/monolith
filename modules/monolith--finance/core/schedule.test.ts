import { describe, expect, it } from 'vitest'

import { buildRateBook } from './fx'
import {
  bucketStarts,
  periodRange,
  previousRange,
  shiftAnchor,
  startOfWeek
} from './periods'
import {
  depositGrowth,
  dueOccurrences,
  occurrenceDate,
  occurrencesBetween,
  projectYear
} from './schedule'

describe('periods', () => {
  it('builds calendar-aligned ranges and buckets', () => {
    expect(periodRange('week', '2026-11-12')).toEqual({
      from: '2026-11-09',
      to: '2026-11-15',
      bucket: 'day'
    })
    expect(periodRange('month', '2024-02-10')).toMatchObject({
      from: '2024-02-01',
      to: '2024-02-29'
    })
    expect(periodRange('year', '2026-06-01').bucket).toBe('month')
    expect(startOfWeek('2026-11-12', 7)).toBe('2026-11-08')
    expect(bucketStarts('2026-01-15', '2026-04-02', 'month')).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01'
    ])
  })

  it('steps back a period for comparisons', () => {
    expect(previousRange('month', '2026-03-31')).toMatchObject({
      from: '2026-02-01',
      to: '2026-02-28'
    })
    expect(shiftAnchor('year', '2026-08-01', -1)).toBe('2025-01-01')
  })
})

describe('recurring schedules', () => {
  const rent = {
    cadence: 'monthly' as const,
    interval: 1,
    start_on: '2026-01-31',
    end_on: null
  }

  it('clamps month ends without drifting', () => {
    expect(occurrenceDate(rent, 1)).toBe('2026-02-28')
    expect(occurrenceDate(rent, 2)).toBe('2026-03-31')
  })

  it('lists due occurrences from the next unposted one', () => {
    expect(
      dueOccurrences(rent, 1, '2026-04-30').map(item => item.date)
    ).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
    expect(
      occurrencesBetween(
        { ...rent, cadence: 'weekly', start_on: '2026-11-02' },
        '2026-11-01',
        '2026-11-30'
      )
    ).toHaveLength(5)
  })

  it('projects a year in the base currency with taxes', () => {
    const book = buildRateBook(
      'AZN',
      ['USD'],
      [
        {
          code: 'AZN',
          custom_rate: null,
          market_usd: null,
          market_per_usd: '1.7',
          market_at: null
        }
      ]
    )
    const plan = projectYear(
      [
        {
          ...rent,
          start_on: '2026-01-01',
          kind: 'income',
          amount: '1000',
          currency: 'AZN',
          account_currency: 'AZN',
          tax_basis: 'gross',
          active: true,
          rule: {
            kind: 'income',
            rate: '0',
            inclusive: false,
            withheld: false,
            components: [
              { label: 'Tax', brackets: [{ up_to: null, rate: '2' }] }
            ]
          }
        },
        {
          ...rent,
          start_on: '2026-01-05',
          kind: 'expense',
          amount: '20',
          currency: 'USD',
          account_currency: 'USD',
          tax_basis: 'net',
          active: true,
          rule: {
            kind: 'vat',
            rate: '18',
            inclusive: false,
            withheld: false,
            components: []
          }
        }
      ],
      2026,
      book
    )

    expect(plan.totals).toMatchObject({
      income_gross: '12000',
      income_tax: '240',
      tax_reserve: '240',
      expense: '481.44',
      vat: '73.44'
    })
    expect(plan.months[1]!.net).toBe('959.88')
  })
})

describe('deposits', () => {
  it('credits simple interest at maturity', () => {
    const result = depositGrowth({
      principal: '10000',
      rate: '10.5',
      months: 6,
      compounding: 'maturity',
      contribution: '0',
      tax_rate: '0',
      currency: 'AZN'
    })

    expect(result.interest).toBe('525')
    expect(result.final).toBe('10525')
  })

  it('compounds monthly and applies tax on interest', () => {
    const result = depositGrowth({
      principal: '1000',
      rate: '12',
      months: 12,
      compounding: 'monthly',
      contribution: '0',
      tax_rate: '10',
      currency: 'AZN'
    })

    // Each month's interest is credited in whole qəpik, like a statement.
    expect(result.interest).toBe('126.84')
    expect(result.tax).toBe('12.68')
    expect(result.final).toBe('1114.16')
  })
})
