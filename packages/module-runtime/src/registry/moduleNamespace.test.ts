import { afterEach, describe, expect, it } from 'vitest'

import { setLoadingModuleId } from './loadingModule'
import { deriveModuleNamespace, resolveCallerModuleId } from './moduleNamespace'

describe('deriveModuleNamespace', () => {
  it('strips the npm scope before deriving', () => {
    expect(deriveModuleNamespace('@monolith/achievements')).toBe(
      'achievements'
    )
    expect(deriveModuleNamespace('@monolith/calendar')).toBe(
      'calendar'
    )
    expect(deriveModuleNamespace('@monolith/monolith--owntracks')).toBe(
      'owntracks'
    )
  })

  it('prefixes non-official authors with a triple underscore', () => {
    expect(
      deriveModuleNamespace('@monolith/example-author--truckers-log')
    ).toBe('example-author___truckers_log')
    expect(deriveModuleNamespace('example-author--invoice-maker')).toBe(
      'example-author___invoice_maker'
    )
  })

  it('handles unscoped ids', () => {
    expect(deriveModuleNamespace('monolith--app')).toBe('app')
    expect(deriveModuleNamespace('dashboard')).toBe('dashboard')
  })
})

describe('resolveCallerModuleId', () => {
  afterEach(() => {
    setLoadingModuleId(undefined)
  })

  it('returns the id the loader is currently importing', () => {
    setLoadingModuleId('monolith--calendar')

    expect(resolveCallerModuleId()).toBe('monolith--calendar')
  })

  it('returns undefined when nothing is being imported', () => {
    expect(resolveCallerModuleId()).toBeUndefined()
  })
})
