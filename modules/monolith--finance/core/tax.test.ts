import { describe, expect, it } from 'vitest'

import { add } from './money'
import {
  type TaxComponent,
  type TaxRuleCore,
  applyTax,
  grossFromNet,
  headlineRate,
  incomeTax,
  vatSplit
} from './tax'

/** Azerbaijan, private non-oil sector salaries from 2026 (monthly). */
const salaryTax: TaxComponent = {
  label: 'Income tax',
  brackets: [
    { up_to: '2500', rate: '3' },
    { up_to: '8000', rate: '10' },
    { up_to: null, rate: '14' }
  ]
}
const simplified: TaxRuleCore = {
  kind: 'income',
  rate: '0',
  inclusive: false,
  withheld: false,
  components: [
    { label: 'Simplified tax', brackets: [{ up_to: null, rate: '2' }] }
  ]
}
const salary: TaxRuleCore = {
  kind: 'income',
  rate: '0',
  inclusive: false,
  withheld: true,
  components: [salaryTax]
}
const digitalVat: TaxRuleCore = {
  kind: 'vat',
  rate: '18',
  inclusive: false,
  withheld: false,
  components: []
}

describe('VAT', () => {
  it('adds VAT on top of a subscription price', () => {
    expect(vatSplit('20', 'net', '18', 2)).toEqual({
      gross: '23.6',
      net: '20',
      tax: '3.6',
      parts: []
    })
  })

  it('extracts VAT included in a price', () => {
    const split = vatSplit('118', 'gross', '18', 2)

    expect(split).toMatchObject({ gross: '118', net: '100', tax: '18' })
  })

  it('always reconciles gross = net + tax after rounding', () => {
    for (const price of ['0.01', '0.99', '9.99', '33.33', '1234.57'])
      for (const basis of ['gross', 'net'] as const) {
        const split = vatSplit(price, basis, '18', 2)

        expect(add(split.net, split.tax)).toBe(split.gross)
      }
  })
})

describe('income tax', () => {
  it('applies the simplified 2% to VÖEN turnover', () => {
    expect(applyTax('1000', 'gross', simplified, 2)).toMatchObject({
      gross: '1000',
      tax: '20',
      net: '980'
    })
  })

  it('applies progressive salary brackets marginally', () => {
    expect(incomeTax('2000', [salaryTax], 2).tax).toBe('60')
    // 75 + 10% of 1500
    expect(incomeTax('4000', [salaryTax], 2).tax).toBe('225')
    // 625 + 14% of 2000
    expect(incomeTax('10000', [salaryTax], 2).tax).toBe('905')
  })

  it('grosses up a net salary exactly', () => {
    for (const gross of ['1500', '2500', '4000', '8000', '12345.67']) {
      const net = incomeTax(gross, [salaryTax], 2).net

      expect(grossFromNet(net, [salaryTax], 2)).toBe(gross)
    }
  })

  it('keeps the identity when an income is entered as received', () => {
    const split = applyTax('3775', 'net', salary, 2)

    expect(split).toMatchObject({ gross: '4000', tax: '225', net: '3775' })
  })

  it('summarizes headline rates', () => {
    expect(headlineRate(digitalVat)).toBe('18%')
    expect(headlineRate(salary)).toBe('3–14%')
  })
})
