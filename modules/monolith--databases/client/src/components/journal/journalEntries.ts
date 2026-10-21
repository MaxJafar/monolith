// SPDX-License-Identifier: 0BSD
import dayjs from 'dayjs'

import type { Field, RecordPage } from '../../../../shared'
import { belongsToSystem } from '../../utils/systemViews'

export function journalEntries(
  records: RecordPage[],
  fields: Field[],
  options: { query?: string; month?: string } = {}
) {
  const query = (options.query || '').trim().toLocaleLowerCase()
  return records
    .filter(
      record =>
        belongsToSystem(record, 'journal', fields) &&
        (!options.month ||
          dayjs(record.date || record.created || record.updated).format(
            'YYYY-MM'
          ) === options.month) &&
        (!query ||
          [record.title, record.description || '', ...(record.tags || [])]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query))
    )
    .sort(
      (a, b) =>
        dayjs(b.date || b.created || b.updated).valueOf() -
          dayjs(a.date || a.created || a.updated).valueOf() ||
        b.updated.localeCompare(a.updated) ||
        a.id.localeCompare(b.id)
    )
}
