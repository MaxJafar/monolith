// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import type { RecordPage } from '../../../../shared'
import { journalEntries } from './journalEntries'

const entry = (id: string, change: Partial<RecordPage> = {}): RecordPage => ({
  id,
  base_id: 'writing',
  title: id,
  content: '',
  values: {},
  updated: '2026-10-21T12:00:00Z',
  ...change
})
it('keeps native posts and earlier journal-tagged records, excluding ordinary notes', () => {
  const rows = [
    entry('ordinary', { item_type: 'note' }),
    entry('old', {
      item_type: 'note',
      tags: [' Journal '],
      date: '2026-09-01T12:00:00Z'
    }),
    entry('new', { item_type: 'post', date: '2026-10-21T12:00:00Z' })
  ]
  expect(journalEntries(rows, []).map(row => row.id)).toEqual(['new', 'old'])
  expect(
    journalEntries(rows, [], { month: '2026-10', query: 'NEW' }).map(
      row => row.id
    )
  ).toEqual(['new'])
  expect(rows.map(row => row.id)).toEqual(['ordinary', 'old', 'new'])
})
it('combines date and text filters with creation dates for undated entries', () => {
  const rows = [
    entry('reflection', {
      item_type: 'post',
      created: '2026-08-10T12:00:00Z',
      description: 'Summer thoughts'
    })
  ]
  expect(
    journalEntries(rows, [], { query: 'summer', month: '2026-08' })
  ).toHaveLength(1)
  expect(
    journalEntries(rows, [], { query: 'summer', month: '2026-10' })
  ).toEqual([])
})
