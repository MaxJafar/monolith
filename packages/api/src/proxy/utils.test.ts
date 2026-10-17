import { describe, expect, it } from 'vitest'

import { getFormData, joinObjectsRecursively } from './utils'

describe('request data preparation', () => {
  it('merges shared objects without accepting cycles or prototype properties', () => {
    const shared = { page: 2 }
    expect(
      joinObjectsRecursively(
        { left: { sort: 'name' } },
        { left: shared, right: shared }
      )
    ).toEqual({ left: { page: 2, sort: 'name' }, right: { page: 2 } })
    expect(
      joinObjectsRecursively(
        {},
        JSON.parse(
          '{"__proto__":{"polluted":true},"constructor":{"prototype":{"bad":true}},"ok":1}'
        )
      )
    ).toEqual({ ok: 1 })
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    expect(() => joinObjectsRecursively({}, cycle)).toThrow('cycle')
  })

  it('preserves form scalar types and puts uploads after metadata', () => {
    const file = new Blob(['example'], { type: 'text/plain' })
    const form = getFormData({
      file,
      title: 'a;b',
      checked: false,
      list: [0, null],
      time: new Date('2026-01-02T00:00:00Z')
    })
    expect([...form.keys()]).toEqual([
      'title',
      'checked',
      'list',
      'time',
      'file'
    ])
    expect(form.get('checked')).toBe('__type:boolean;false')
    expect(form.get('list')).toBe('__type:array;[0,null]')
    expect(form.get('time')).toBe('__type:date;"2026-01-02T00:00:00.000Z"')
    expect(() => getFormData({ files: [file, 'wrong'] })).toThrow('mix')
  })
})
