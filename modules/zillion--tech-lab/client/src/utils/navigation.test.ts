import { describe, expect, it } from 'vitest'

import { getSection, safeWebUrl, sectionParams, sections } from './navigation'

describe('Tech Lab navigation', () => {
  it.each(sections)('retains the %s section in URL state', section => {
    expect(getSection(sectionParams(section).get('section'))).toBe(section)
  })
  it('recovers an unknown section without interpreting it as a route', () => {
    expect(getSection('javascript:alert(1)')).toBe('overview')
  })
  it('encodes detail identifiers and search values without changing the section', () => {
    const params = sectionParams('services', {
      service: 'uuid',
      q: 'a&section=import'
    })
    expect(params.get('section')).toBe('services')
    expect(params.get('q')).toBe('a&section=import')
  })
  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'smb://host/share',
    'http://user:secret@host',
    '//host/path',
    ''
  ])('rejects a non-web or credential-bearing URL %s', value => {
    expect(safeWebUrl(value)).toBeNull()
  })
  it('keeps an ordinary HTTP service link and its path', () => {
    expect(safeWebUrl('http://192.168.1.20:3000/dashboard?q=1')).toBe(
      'http://192.168.1.20:3000/dashboard?q=1'
    )
  })
})
