import { describe, expect, it } from 'vitest'

import { registryConfig } from './registryConfig'

describe('independent addon registry', () => {
  it('does not contact a default or inherited service', () => {
    expect(() => registryConfig({})).toThrow('No addon registry configured')
  })
  it('uses the explicitly configured repository and revision', () => {
    expect(
      registryConfig({
        MONOLITH_REGISTRY_REPO: 'example/addons',
        MONOLITH_REGISTRY_REF: 'stable'
      })
    ).toEqual({ repo: 'example/addons', ref: 'stable' })
  })
  it('rejects URLs, traversal and shell characters', () => {
    for (const repo of [
      'https://example.com/addons',
      '../addons',
      'owner/repo;whoami'
    ])
      expect(() => registryConfig({ MONOLITH_REGISTRY_REPO: repo })).toThrow(
        'owner/repository'
      )
    expect(() =>
      registryConfig({
        MONOLITH_REGISTRY_REPO: 'owner/addons',
        MONOLITH_REGISTRY_REF: '../main'
      })
    ).toThrow('valid branch')
  })
})
