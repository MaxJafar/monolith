import { describe, expect, it } from 'vitest'

import { type Field, type RecordPage, viewProperties } from '../../../shared'
import { boardGroups, boardValue } from './board'

const record: RecordPage = {
  id: 'record',
  base_id: 'base',
  title: 'Task',
  content: '',
  values: {},
  updated: '',
  done: false
}
const field = {
  id: 'status',
  kind: 'select',
  config: { options: ['Planned', 'Done'] }
} as Field
const t = (key: string) => key

describe('Board grouping', () => {
  it('keeps empty values and removed options in visible groups', () => {
    const records = [
      record,
      { ...record, values: { status: '' } },
      { ...record, values: { status: 'Archived option' } }
    ]
    expect(boardGroups(field, records, t).map(group => group.value)).toEqual([
      null,
      'Planned',
      'Done',
      'Archived option'
    ])
    for (const item of records)
      expect(
        boardGroups(field, records, t).some(
          group => group.value === boardValue(item, field)
        )
      ).toBe(true)
  })

  it('reads built-in fields from canonical properties rather than stale custom values', () => {
    const done = viewProperties('base', t).find(item => item.id === 'done')!
    expect(
      boardValue({ ...record, done: true, values: { done: false } }, done)
    ).toBe(true)
    expect(boardGroups(done, [], t).map(group => group.value)).toEqual([
      false,
      true
    ])
  })
})
