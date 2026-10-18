// @vitest-environment jsdom
import { type ReactNode, act, createElement, useState } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createMemoryRouter,
  useLocation,
  useNavigate
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CellValue, RecordPage, Snapshot } from '../../../shared'
import { indexKnowledge, indexSnapshot } from '../utils/snapshotIndex'
import { RecordEditor } from './RecordEditor'

const api = vi.hoisted(() => ({ save: vi.fn() }))

const record: RecordPage = {
  id: 'launch',
  base_id: 'projects',
  title: 'Launch',
  content: 'Saved content',
  values: {},
  updated: '2026-10-13T12:00:00Z'
}
const snapshot: Snapshot = {
  bases: [{ id: 'projects', name: 'Projects', description: '' }],
  records: [record],
  fields: [],
  views: [],
  links: []
}
const knowledge = { nodes: [], edges: [], unresolved: 0 }

type PrimitiveProps = { children?: ReactNode; role?: string }
type ButtonProps = PrimitiveProps & {
  'aria-label'?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  autoFocus?: boolean
}

vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/manifest', () => ({ workspaceAPI: {} }))
vi.mock('./calendar/CalendarScheduleEditor', () => ({
  CalendarScheduleEditor: ({
    onDirtyChange
  }: {
    onDirtyChange: (dirty: boolean) => void
  }) =>
    createElement(
      'button',
      { onClick: () => onDirtyChange(true) },
      'change schedule'
    )
}))
vi.mock('./RecordSurface', () => ({
  RecordSurface: ({
    children,
    toolbar
  }: {
    children: ReactNode
    toolbar: ReactNode
  }) => createElement('div', null, toolbar, children)
}))
vi.mock('./PropertyCell', () => ({
  PropertyCell: ({
    field,
    value,
    onChange
  }: {
    field: { id: string; name: string; config: { options: string[] } }
    value: string
    onChange: (value: string) => void
  }) =>
    field.id === 'item_type'
      ? createElement(
          'select',
          {
            'aria-label': field.name,
            value,
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
              onChange(event.target.value)
          },
          field.config.options.map(option =>
            createElement('option', { key: option, value: option }, option)
          )
        )
      : createElement('span', null, value)
}))
vi.mock('./SelectInput', () => ({
  SelectInput: ({
    label,
    value,
    options,
    onChange
  }: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }) =>
    createElement(
      'select',
      {
        'aria-label': label,
        value,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value)
      },
      options.map(option =>
        createElement(
          'option',
          { key: option.value, value: option.value },
          option.label
        )
      )
    )
}))
vi.mock('@/DatabaseProvider', () => ({
  useDatabases: () => ({
    base: snapshot.bases[0],
    index: indexSnapshot(snapshot),
    knowledge,
    knowledgeIndex: indexKnowledge(knowledge),
    busy: false,
    people: [],
    api: {
      updateRecord: { input: () => ({ mutate: api.save }) },
      snapshot: {
        query: async () => ({ ...snapshot, records: [editingRecord] })
      }
    },
    run: async (action: () => Promise<unknown>) => action(),
    openRecord: () => {},
    openPage: () => {}
  })
}))
vi.mock('@monolith/ui', () => {
  const primitive = ({ children, role }: PrimitiveProps) =>
    createElement('div', { role }, children)

  return {
    useAnimatedClose: (close: () => void) => ({ closing: false, close }),
    useCoverPicker: () => () => {},
    useModalStore: () => ({ open: vi.fn() }),
    IconPickerModal: () => null,
    AppearanceContext: primitive,
    AppearanceCover: () => null,
    IconInput: () => null,
    Icon: () => null,
    FloatingPopover: primitive,
    AnimatedCollapse: primitive,
    PopoverButton: primitive,
    Box: ({
      as,
      children,
      value,
      onChange,
      ...props
    }: {
      as?: string
      children?: ReactNode
      value?: string
      onChange?: (event: { target: { value: string } }) => void
    }) =>
      as === 'input'
        ? createElement(
            'div',
            null,
            createElement('output', { 'data-testid': 'title' }, value),
            createElement(
              'button',
              {
                onClick: () =>
                  onChange?.({ target: { value: 'Unsaved title' } })
              },
              'change title'
            )
          )
        : createElement(as ?? 'div', props, children),
    CanonicalSource: primitive,
    Button: ({
      children,
      onClick,
      disabled,
      loading,
      autoFocus,
      'aria-label': label
    }: ButtonProps) =>
      createElement(
        'button',
        {
          onClick,
          disabled: disabled || loading,
          autoFocus,
          'aria-label': label
        },
        children
      ),
    Stack: primitive,
    Flex: primitive,
    Grid: primitive,
    Card: primitive,
    Text: primitive,
    TextInput: ({
      value,
      onChange,
      disabled
    }: {
      value: string
      onChange: (value: string) => void
      disabled?: boolean
    }) =>
      createElement(
        'div',
        null,
        createElement('output', { 'data-testid': 'title' }, value),
        createElement(
          'button',
          { disabled, onClick: () => onChange('Unsaved title') },
          'change title'
        )
      ),
    BlockEditor: ({
      value,
      onChange
    }: {
      value: string
      onChange: (value: string) => void
    }) =>
      createElement(
        'div',
        null,
        createElement('output', { 'data-testid': 'content' }, value),
        createElement(
          'button',
          { onClick: () => onChange('Unsaved content') },
          'change content'
        )
      )
  }
})

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let mode: 'saved' | 'new'
let editingRecord: RecordPage = record
let prefill: Record<string, CellValue>
let container: HTMLDivElement
let root: Root | undefined
let router: ReturnType<typeof createMemoryRouter> | undefined
let refreshRecord: () => void
let deferNavigation = false
let queuedNavigation: (() => void) | undefined

function Workspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const [creating, setCreating] = useState(true)
  const [, refresh] = useState(0)
  refreshRecord = () => refresh(value => value + 1)

  if (
    (mode === 'saved' && !new URLSearchParams(location.search).has('record')) ||
    (mode === 'new' && !creating)
  )
    return createElement('div', { 'data-testid': 'base' }, 'Base view')

  return createElement(RecordEditor, {
    record: mode === 'saved' ? editingRecord : undefined,
    initialValues: prefill,
    onDone:
      mode === 'saved'
        ? () => {
            if (deferNavigation) {
              queuedNavigation = () => navigate('/databases?base=projects')
              refresh(value => value + 1)
            } else navigate('/databases?base=projects')
          }
        : () => setCreating(false)
  })
}

async function mount(
  selected: 'saved' | 'new',
  initialValues: Record<string, CellValue> = {},
  existing: RecordPage = record
) {
  mode = selected
  editingRecord = existing
  prefill = initialValues
  router = createMemoryRouter([{ path: '/databases', Component: Workspace }], {
    initialEntries: [
      selected === 'saved'
        ? '/databases?base=projects&record=launch'
        : '/databases?base=projects'
    ]
  })
  root = createRoot(container)
  await act(async () =>
    root!.render(createElement(RouterProvider, { router: router! }))
  )
}

async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find(
    button =>
      button.textContent === text || button.getAttribute('aria-label') === text
  )

  expect(button, text).toBeDefined()
  await act(async () => button!.click())
}

beforeEach(() => {
  api.save.mockReset()
  deferNavigation = false
  queuedNavigation = undefined
  container = document.createElement('div')
  document.body.append(container)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  router?.dispose()
  container.remove()
  vi.restoreAllMocks()
})

describe('RecordEditor in-app Back confirmation', () => {
  it('protects a scheduling draft and honors discard across delayed query navigation', async () => {
    deferNavigation = true
    await mount('saved', {}, { ...record, item_type: 'event' })
    await click('change schedule')
    await click('buttons.backToDatabase')
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    await click('docs.keepEditing')
    expect(container.querySelector('[data-testid="base"]')).toBeNull()
    await click('buttons.backToDatabase')
    await click('docs.discard')
    expect(queuedNavigation).toBeDefined()
    await act(async () => queuedNavigation!())
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(api.save).not.toHaveBeenCalled()
  })

  it('refreshes an unchanged open page when its canonical record changes', async () => {
    await mount('saved')
    editingRecord = {
      ...record,
      title: 'Updated elsewhere',
      updated: '2026-10-15T12:00:00Z'
    }
    await act(async () => refreshRecord())
    expect(container.querySelector('[data-testid="title"]')?.textContent).toBe(
      'Updated elsewhere'
    )
  })

  it('keeps a local draft when a refreshed record arrives', async () => {
    await mount('saved')
    await click('change title')
    editingRecord = {
      ...record,
      title: 'Updated elsewhere',
      updated: '2026-10-15T12:00:00Z'
    }
    await act(async () => refreshRecord())
    expect(container.querySelector('[data-testid="title"]')?.textContent).toBe(
      'Unsaved title'
    )
  })

  it.each(['note', 'task'])(
    'preserves event dates when changing type to %s',
    async type => {
      const event = {
        ...record,
        item_type: 'event',
        date: '2026-10-13T13:15:00.000Z',
        end_date: '2026-10-15T17:30:00.000Z'
      }
      api.save.mockResolvedValue({ ...event, item_type: type })
      await mount('saved', {}, event)
      const picker = container.querySelector<HTMLSelectElement>(
        'select[aria-label="itemType"]'
      )!
      await act(async () => {
        picker.value = type
        picker.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await click('buttons.savePage')
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({
          item_type: type
        })
      )
      const patch = api.save.mock.calls[0]![0]
      expect({ ...event, ...patch }).toMatchObject({
        date: event.date,
        end_date: event.end_date
      })
    }
  )
  it('blocks saved-record Back through the router and preserves the draft until discarded', async () => {
    await mount('saved')
    await click('change content')
    await click('buttons.backToDatabase')
    expect(window.confirm).not.toHaveBeenCalled()
    expect(router?.state.location.search).toContain('record=launch')
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    expect(document.activeElement?.textContent).toBe('docs.keepEditing')
    await click('docs.keepEditing')
    expect(
      container.querySelector('[data-testid="content"]')?.textContent
    ).toBe('Unsaved content')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await click('buttons.backToDatabase')
    await click('docs.discard')
    expect(router?.state.location.search).toBe('?base=projects')
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
  })

  it('leaves an unchanged saved record without prompting', async () => {
    await mount('saved')
    await click('buttons.backToDatabase')
    expect(window.confirm).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
  })

  it('protects a new local record when Back does not trigger a router transition', async () => {
    await mount('new')
    await click('change title')
    await click('buttons.backToDatabase')
    expect(window.confirm).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="base"]')).toBeNull()
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    await click('docs.keepEditing')
    expect(container.querySelector('[data-testid="title"]')?.textContent).toBe(
      'Unsaved title'
    )
    await click('buttons.backToDatabase')
    await click('buttons.backToDatabase')
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    await click('docs.discard')
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
  })

  it('also protects a new record prefilled from a calendar date', async () => {
    await mount('new', { date: '2026-10-13' })
    await click('buttons.backToDatabase')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="base"]')).toBeNull()
    await click('docs.discard')
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
  })

  it('closes an untouched empty new record without prompting', async () => {
    await mount('new')
    await click('buttons.backToDatabase')
    expect(window.confirm).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
  })
})
