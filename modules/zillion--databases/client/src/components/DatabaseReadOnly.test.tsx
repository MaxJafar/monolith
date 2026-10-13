// @vitest-environment jsdom
import { type ReactNode, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { type RecordPage, viewProperties } from '../../../shared'
import { CalendarRecordCard } from './CalendarRecordCard'
import { DatabaseKanban } from './DatabaseKanban'

type PrimitiveProps = { children?: ReactNode; draggable?: boolean }

const record: RecordPage = {
  id: 'task',
  base_id: 'projects',
  title: 'Launch task',
  content: '',
  values: {},
  updated: '',
  done: false
}

vi.mock('@lifeforge/localization', () => ({
  useModuleTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/DatabaseProvider', () => ({
  useDatabases: () => ({
    busy: false,
    readOnly: true,
    propertyLabel: () => '',
    openRecord: () => {},
    recordHref: () => '?record=task'
  })
}))
vi.mock('./PropertyEditor', () => ({
  PropertyEditor: ({ disabled }: { disabled: boolean }) =>
    createElement('select', { disabled })
}))
vi.mock('@lifeforge/ui', () => {
  function Primitive({ children, draggable }: PrimitiveProps) {
    return createElement('div', { draggable }, children)
  }

  return {
    Box: Primitive,
    Flex: Primitive,
    Stack: Primitive,
    Text: ({
      as = 'span',
      children,
      to
    }: PrimitiveProps & { as?: React.ElementType; to?: string }) =>
      createElement(as, { to }, children),
    Icon: () => null,
    colorWithOpacity: () => 'transparent',
    Button: ({
      as = 'button',
      children,
      disabled,
      to,
      ...props
    }: PrimitiveProps & {
      as?: React.ElementType
      disabled?: boolean
      to?: string
      'aria-label'?: string
    }) =>
      createElement(
        as,
        { disabled, to, 'aria-label': props['aria-label'] },
        children
      )
  }
})

describe('Read-only database browsing', () => {
  it('allows opening calendar pages while disabling drag and date moves', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(
      createElement(CalendarRecordCard, {
        record,
        fields: [],
        onMove: () => {}
      })
    )

    expect(
      container.querySelector('[draggable]')?.getAttribute('draggable')
    ).toBe('false')
    const buttons = container.querySelectorAll('button')
    expect(buttons[0]!.disabled).toBe(false)
    expect(buttons[1]!.disabled).toBe(true)
  })

  it('allows opening board pages while disabling drag and group edits', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(DatabaseKanban, {
          fields: [],
          records: [record],
          groupField: viewProperties('projects', key => key).find(
            field => field.id === 'done'
          )
        })
      )
    )

    expect(
      container.querySelector('[draggable]')?.getAttribute('draggable')
    ).toBe('false')
    expect(container.querySelector('select, [aria-haspopup="menu"]')).toBeNull()
    expect(container.querySelector('a')?.getAttribute('href')).toContain(
      'record=task'
    )
    expect(container.querySelector('a')?.hasAttribute('disabled')).toBe(false)
  })
})
