import { describe, expect, it } from 'vitest'

import {
  modulePath,
  navigationMatches,
  pathIsActive,
  sidebarShouldCloseOnEscape,
  workspaceRedirect
} from './navigation'

describe('Workspace module navigation', () => {
  it('returns to a local deep link after authentication', () => {
    expect(workspaceRedirect('/projects?panel=board&project=1#task')).toBe(
      '/projects?panel=board&project=1#task'
    )
  })

  it('rejects external, malformed and looping authentication redirects', () => {
    for (const value of [
      null,
      '',
      '/',
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/auth',
      '/auth/login?redirect=/auth',
      '/%61uth',
      '/broken%path',
      '/page%5cname'
    ]) {
      expect(workspaceRedirect(value)).toBe('/dashboard')
    }
  })
  it('retains a module name after removing its package scope and publisher', () => {
    expect(modulePath('@monolith/todo-list')).toBe('/todo-list')
    expect(modulePath('monolith--agents')).toBe('/agents')
    expect(modulePath('publisher--name--detail')).toBe('/name--detail')
  })

  it('marks descendants active without matching similarly named modules', () => {
    expect(pathIsActive('/notes/entry', '/notes')).toBe(true)
    expect(pathIsActive('/notes', '/notes')).toBe(true)
    expect(pathIsActive('/notes-extra', '/notes')).toBe(false)
  })

  it('matches trimmed search against localized module or category labels', () => {
    expect(navigationMatches('  AGENTS  ', 'Agents', 'Work')).toBe(true)
    expect(navigationMatches('知识', 'Knowledge', '知识库')).toBe(true)
    expect(navigationMatches('agents', 'Wallet', 'Life')).toBe(false)
    expect(navigationMatches('   ', 'Wallet')).toBe(true)
  })

  it('closes an expanded mobile drawer on Escape without closing desktop navigation', () => {
    const escape = {
      key: 'Escape',
      defaultPrevented: false,
      isComposing: false
    }
    expect(sidebarShouldCloseOnEscape(escape, true, 390)).toBe(true)
    expect(sidebarShouldCloseOnEscape(escape, true, 1000)).toBe(true)
    expect(sidebarShouldCloseOnEscape(escape, true, 1001)).toBe(false)
    expect(sidebarShouldCloseOnEscape(escape, true, 1024)).toBe(false)
    expect(sidebarShouldCloseOnEscape(escape, false, 390)).toBe(false)
  })

  it('leaves Escape to a nested overlay or IME and ignores ordinary typing', () => {
    const escape = {
      key: 'Escape',
      defaultPrevented: false,
      isComposing: false
    }
    expect(
      sidebarShouldCloseOnEscape(
        { ...escape, defaultPrevented: true },
        true,
        390
      )
    ).toBe(false)
    expect(
      sidebarShouldCloseOnEscape({ ...escape, isComposing: true }, true, 390)
    ).toBe(false)
    expect(
      sidebarShouldCloseOnEscape({ ...escape, key: 'Enter' }, true, 390)
    ).toBe(false)
  })
})
