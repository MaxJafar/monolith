import { describe, expect, it } from 'vitest'

import { type Field, type RecordPage, viewProperties } from '../../../shared'
import {
  boardCellKey,
  boardColumnWidth,
  boardGroupKey,
  boardGroups,
  boardValue,
  boardValues,
  insertBoardGroup,
  insertBoardRecord,
  orderedBoardGroups,
  orderedBoardRecords
} from './board'

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
  id: '33333333-3333-4333-8333-333333333333',
  kind: 'select',
  config: { options: ['Planned', 'Done'] }
} as Field
const t = (key: string) => key

describe('Board column layout', () => {
  it('retains collapsed and filtered groups while inserting before a visible column', () => {
    expect(
      insertBoardGroup(['a', 'c', 'd'], ['a', 'b', 'c', 'd'], 'd', 'c')
    ).toEqual(['a', 'b', 'd', 'c'])
    expect(
      insertBoardGroup(['a', 'c', 'd'], ['a', 'b', 'c', 'd'], 'a', null)
    ).toEqual(['b', 'c', 'd', 'a'])
  })
  it('keeps positions when groups reappear, appending new groups in schema order', () => {
    const groups = [null, 'Plan', 'Build', 'New'].map(value => ({
      value,
      label: String(value)
    }))
    const order = ['Build', null, 'Plan'].map(value =>
      boardGroupKey(field.id, value)
    )
    expect(
      orderedBoardGroups(groups, field.id, order).map(group => group.value)
    ).toEqual(['Build', null, 'Plan', 'New'])
    expect(orderedBoardGroups(groups, 'different-field', order)).toEqual(groups)
  })
  it('keeps null, boolean, and string group identities distinct', () => {
    const keys = [null, 'null', false, 'false'].map(value =>
      boardGroupKey(field.id, value)
    )
    expect(new Set(keys).size).toBe(4)
  })
  it('limits resized columns to usable widths', () => {
    expect(boardColumnWidth()).toBe(280)
    expect(boardColumnWidth(-200)).toBe(240)
    expect(boardColumnWidth(5000)).toBe(640)
    expect(boardColumnWidth(322.4)).toBe(322)
  })
})

describe('Board order', () => {
  const records = ['a', 'b', 'c', 'd'].map(id => ({ ...record, id }))
  it('reorders without losing hidden cards or duplicating the dragged card', () => {
    expect(insertBoardRecord(records, ['a', 'b', 'c', 'd'], 'd', 'b')).toEqual([
      'a',
      'd',
      'b',
      'c'
    ])
    expect(insertBoardRecord(records, ['a', 'd', 'b', 'c'], 'a', null)).toEqual(
      ['d', 'b', 'c', 'a']
    )
    expect(records.map(item => item.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('inserts into empty columns and columns already containing another membership', () => {
    expect(insertBoardRecord([], [], 'a', null)).toEqual(['a'])
    expect(insertBoardRecord(records, ['c', 'a'], 'a', 'c')).toEqual([
      'a',
      'c',
      'b',
      'd'
    ])
  })
  it('appends unsorted new cards stably and ignores deleted IDs', () => {
    expect(
      orderedBoardRecords(records, ['deleted', 'd', 'b']).map(item => item.id)
    ).toEqual(['d', 'b', 'a', 'c'])
    expect(insertBoardRecord(records, [], 'b', 'deleted')).toEqual([
      'a',
      'c',
      'd',
      'b'
    ])
  })
  it('keeps group and subgroup positions independent without key collisions', () => {
    expect(boardCellKey(field, null)).not.toBe(boardCellKey(field, 'null'))
    expect(boardCellKey(field, 'a:b', field, 'c')).not.toBe(
      boardCellKey(field, 'a', field, 'b:c')
    )
    expect(boardCellKey(field, 'a', field, 'native')).not.toBe(
      boardCellKey(field, 'a', field, 'web')
    )
  })
})

describe('Board grouping', () => {
  it('shows a multi-select record in every selected group without duplicate membership', () => {
    const tags = { ...field, kind: 'multi-select' as const }
    const item = {
      ...record,
      values: { [tags.id]: ['Design', 'Build', 'Design'] }
    }
    expect(boardValues(item, tags)).toEqual(['Design', 'Build'])
    expect(boardGroups(tags, [item], t).map(group => group.value)).toContain(
      'Build'
    )
    expect(boardValues(record, tags)).toEqual([null])
  })
  it('groups relations using canonical links and resolves their page titles', () => {
    const relation = {
      ...field,
      kind: 'relation' as const,
      config: { ...field.config, options: [] }
    }
    const links = [
      {
        id: 'link',
        field_id: field.id,
        source_record_id: record.id,
        target_record_id: 'project'
      }
    ]
    expect(
      boardGroups(relation, [record], t, links, () => 'Launch project')
    ).toEqual([
      { value: null, label: 'ungrouped' },
      { value: 'project', label: 'Launch project' }
    ])
  })
  it('keeps empty values and removed options in visible groups', () => {
    const records = [
      record,
      { ...record, values: { [field.id]: '' } },
      { ...record, values: { [field.id]: 'Archived option' } }
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
