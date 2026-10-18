import { expect, it } from 'vitest'

import { viewConfigSchema } from '../../../shared'
import { type ViewInput, mergeViewEdit } from './viewEdits'

it('merges a delayed filter edit without overwriting newer appearance and layout choices', () => {
  const before: ViewInput = {
    name: 'Table',
    mode: 'table',
    group_field_id: null,
    config: viewConfigSchema.parse({})
  }
  const current: ViewInput = {
    ...before,
    name: 'Studio',
    mode: 'gallery',
    config: {
      ...before.config,
      tab: { icon: 'lucide:rocket', text_color: '#9b61cc' }
    }
  }
  const next: ViewInput = {
    ...before,
    config: {
      ...before.config,
      filters: [{ field_id: 'title', operator: 'contains', value: 'Alpha' }]
    }
  }
  const merged = mergeViewEdit(current, before, next)
  expect(merged.name).toBe('Studio')
  expect(merged.mode).toBe('gallery')
  expect(merged.config.tab).toEqual(current.config.tab)
  expect(merged.config.filters).toEqual(next.config.filters)
})
