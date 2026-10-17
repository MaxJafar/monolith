// @vitest-environment jsdom
import { type ElementType, type ReactNode, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type CellValue,
  type Field,
  type Snapshot,
  displayValue,
  fieldConfigSchema,
  viewConfigSchema
} from '../../../shared'
import { recordNavigation } from '../utils/navigation'
import { indexSnapshot } from '../utils/snapshotIndex'
import { DatabaseTable } from './DatabaseTable'

type PrimitiveProps = {
  as?: ElementType
  children?: ReactNode
  'aria-label'?: string
  dateTime?: string
}

let data: Snapshot
let index: ReturnType<typeof indexSnapshot>
let readOnly: boolean

vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/DatabaseProvider', () => ({
  useDatabases: () => ({
    data,
    index,
    readOnly,
    base: data.bases[0],
    recordHref: (record: { id: string; base_id: string }) =>
      `?${recordNavigation(record, 'projects', 'launchboard', { calendarDate: '2026-10-13', calendarLayout: 'week' })}`,
    propertyLabel: (field: Field, value: CellValue | undefined) =>
      field.kind === 'person' && value ? 'Alex' : displayValue(value)
  })
}))
vi.mock('@monolith/ui', () => ({
  ChoiceSelect: ({
    label,
    disabled,
    value
  }: {
    label: string
    disabled?: boolean
    value: string
  }) =>
    createElement(
      'select',
      { 'aria-label': label, disabled, defaultValue: value },
      createElement('option', { value }, value)
    ),
  Box: ({ as = 'div', children, 'aria-label': label }: PrimitiveProps) =>
    createElement(as, { 'aria-label': label }, children),
  Flex: ({ children }: PrimitiveProps) => createElement('div', null, children),
  Text: ({ as = 'span', children, dateTime }: PrimitiveProps) =>
    createElement(as, { dateTime }, children),
  Icon: () => createElement('span', { 'aria-hidden': true }),
  TagChip: ({ as = 'span', label }: PrimitiveProps & { label: string }) =>
    createElement(as, null, label),
  Button: ({
    as = 'button',
    children,
    to,
    onClick,
    disabled
  }: PrimitiveProps & {
    to?: string
    onClick?: () => void
    disabled?: boolean
  }) => createElement(as, { to, onClick, disabled }, children)
}))

beforeEach(() => {
  readOnly = false
  data = {
    bases: [
      { id: 'projects', name: 'Mission control', description: '' },
      { id: 'people', name: 'People', description: '' }
    ],
    records: Array.from({ length: 1000 }, (_, i) => ({
      id: `project-${i}`,
      base_id: 'projects',
      title: `Project ${i}`,
      content: '',
      values: {},
      updated: ''
    })),
    fields: [
      {
        id: 'owner',
        base_id: 'projects',
        name: 'Owner',
        kind: 'relation',
        target_base_id: 'people',
        position: 0,
        config: fieldConfigSchema.parse({})
      }
    ],
    views: [
      {
        id: 'launchboard',
        base_id: 'projects',
        name: 'Launchboard',
        mode: 'table',
        group_field_id: null,
        config: viewConfigSchema.parse({})
      }
    ],
    links: Array.from({ length: 1000 }, (_, i) => ({
      id: `link-${i}`,
      field_id: 'owner',
      source_record_id: `project-${i}`,
      target_record_id: 'alex'
    }))
  }
  data.records.push({
    id: 'alex',
    base_id: 'people',
    title: 'Alex',
    content: '',
    values: {},
    updated: ''
  })
  index = indexSnapshot(data)
})

function renderTable() {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/databases'] },
      createElement(DatabaseTable, {
        fields: data.fields,
        records: data.records.slice(0, 1000),
        onEditField: () => {},
        onAddField: () => {}
      })
    )
  )
  const container = document.createElement('div')
  container.innerHTML = html

  return container
}

describe('Relation table rendering and native navigation', () => {
  it('renders a thousand relations without filtering all links or searching all records per cell', () => {
    const filter = vi.spyOn(data.links, 'filter')
    const find = vi.spyOn(data.records, 'find')
    const table = renderTable()

    expect(
      table.querySelectorAll('tbody tr:not(.database-new-row)')
    ).toHaveLength(1000)
    expect(table.querySelectorAll('tbody a')).toHaveLength(2000)
    expect(filter).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
  })

  it('provides normal record and cross-base relation links with the correct view context', () => {
    const table = renderTable()
    const links = table.querySelectorAll('tbody tr:first-child a')
    const page = new URL(
      links[0]!.getAttribute('href')!,
      'https://zillion.test'
    )
    const related = new URL(
      links[1]!.getAttribute('href')!,
      'https://zillion.test'
    )

    expect(page.pathname).toBe('/databases')
    expect(page.searchParams.get('record')).toBe('project-0')
    expect(page.searchParams.get('view')).toBe('launchboard')
    expect(page.searchParams.get('calendarDate')).toBe('2026-10-13')
    expect(related.searchParams.get('base')).toBe('people')
    expect(related.searchParams.get('record')).toBe('alex')
    expect(related.searchParams.has('view')).toBe(false)
    expect(related.searchParams.has('calendarDate')).toBe(false)
  })

  it('names the table and exposes property headers as edit buttons rather than navigation links', () => {
    const table = renderTable()

    expect(table.querySelector('table')?.getAttribute('aria-label')).toBe(
      'Mission control'
    )
    expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(4)
    expect(table.querySelector('select')?.getAttribute('aria-label')).toContain(
      'itemType'
    )
    expect(table.querySelector('thead button')?.textContent).toBe('Owner')
    expect(table.querySelector('thead a')).toBeNull()
  })

  it('keeps record and relation navigation usable while viewers cannot edit schema or change item types', () => {
    readOnly = true
    const table = renderTable()

    expect(
      table.querySelector<HTMLButtonElement>('thead button')?.disabled
    ).toBe(true)
    expect(table.querySelector<HTMLSelectElement>('select')?.disabled).toBe(
      true
    )
    expect(table.querySelectorAll('tbody tr:first-child a')).toHaveLength(2)
    expect(table.querySelector('tbody a')?.hasAttribute('disabled')).toBe(false)
  })

  it('keeps exact zero, unchecked, individual tags, civil dates and person names in typed cells', () => {
    data.fields = (
      ['number', 'checkbox', 'multi-select', 'date', 'person', 'text'] as const
    ).map((kind, position) => ({
      id: kind,
      base_id: 'projects',
      name: kind,
      kind,
      target_base_id: null,
      position,
      config: fieldConfigSchema.parse({})
    }))
    data.records = [
      {
        id: 'zero',
        base_id: 'projects',
        title: 'Launch',
        content: '',
        updated: '',
        values: {
          number: 0,
          checkbox: false,
          'multi-select': ['Art', 'Cart'],
          date: '2026-10-13',
          person: 'owned-person-id',
          text: null
        }
      }
    ]
    index = indexSnapshot(data)
    const table = renderTable()
    const cell = (kind: string) =>
      table.querySelector(`td[data-kind="${kind}"]`)

    expect(cell('number')?.textContent).toBe('0')
    expect(
      cell('checkbox')
        ?.querySelector('[role="checkbox"]')
        ?.getAttribute('aria-checked')
    ).toBe('false')
    expect(cell('multi-select')?.querySelectorAll('span')).toHaveLength(2)
    expect(cell('multi-select')?.textContent).toBe('ArtCart')
    expect(cell('date')?.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-10-13'
    )
    expect(cell('person')?.textContent).toBe('Alex')
    expect(table.textContent).not.toContain('owned-person-id')
    expect(cell('text')?.textContent).toBe('emptyValue')
    expect(table.querySelectorAll('tbody a')).toHaveLength(1)
  })

  it('ends an empty table with its create row after the empty state', () => {
    data.records = []
    index = indexSnapshot(data)
    const table = renderTable()
    expect(table.querySelector('tbody tr:first-child')?.textContent).toContain('noRecords')
    expect(table.querySelector('tbody tr:last-child button')?.textContent).toBe('newRecord')
  })
})
