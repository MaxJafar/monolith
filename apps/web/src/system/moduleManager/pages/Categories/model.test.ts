import { describe, expect, it } from 'vitest'

import { deleteCategory, editCategories, reorderCategories } from './model'

describe('Monolith category editing', () => {
  const saved = {
    work: { en: 'Work' },
    study: { en: 'Study' },
    home: { en: 'Home' }
  }
  it('keeps a renamed category at its original position without changing the source', () => {
    const next = editCategories(
      saved,
      [{ key: 'learning', value: { en: 'Learning' } }],
      'study'
    )
    expect(Object.keys(next)).toEqual(['work', 'learning', 'home'])
    expect(Object.keys(saved)).toEqual(['work', 'study', 'home'])
  })
  it('rejects accidental overwrite, duplicate batch keys and prototype keys', () => {
    expect(() => editCategories(saved, [{ key: 'work', value: {} }])).toThrow()
    expect(() =>
      editCategories(saved, [
        { key: 'new', value: {} },
        { key: 'new', value: {} }
      ])
    ).toThrow()
    expect(() =>
      editCategories(saved, [{ key: '__proto__', value: {} }])
    ).toThrow()
  })
  it('preserves translations on reorder and ignores an invalid drop target', () => {
    const moved = reorderCategories(saved, 'home', 'work')
    expect(Object.keys(moved)).toEqual(['home', 'work', 'study'])
    expect(moved.home).toEqual(saved.home)
    expect(reorderCategories(saved, 'missing', 'work')).toBe(saved)
    expect(Object.keys(deleteCategory(saved, 'study'))).toEqual([
      'work',
      'home'
    ])
  })
})
