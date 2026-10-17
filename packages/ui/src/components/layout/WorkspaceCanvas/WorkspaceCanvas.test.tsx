// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ElementType, type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CanvasBlock, CanvasPage } from '@monolith/blocks'

import { type CanvasPageStorage, WorkspaceCanvas } from './index'

const contract = vi.hoisted(() => ({
  queryKey: ['workspace-contract', 'page', 'fixture'],
  query: vi.fn(),
  mutate: vi.fn()
}))

vi.mock('@monolith/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@monolith/api')>()),
  useAuth: () => ({ userData: { id: 'fixture-owner' } }),
  useGateway: () => ({
    client: null,
    loading: false,
    error: null,
    drafts: null
  }),
  gatewayQueryKey: (...parts: unknown[]) => ['canonical-fixture', ...parts]
}))
vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: () => false }
  })
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'common.personalization:title' ? 'Personalization' : key
  })
}))
vi.mock('@/utils/workspaceAPI', () => ({
  workspaceAPI: {
    user: {
      pages: {
        get: {
          input: () => ({
            query: contract.query,
            queryOptions: () => ({
              queryKey: contract.queryKey,
              staleTime: Infinity,
              retry: false,
              refetchOnWindowFocus: false
            })
          })
        },
        save: { mutate: contract.mutate },
        list: { key: ['workspace-contract', 'page-list'] }
      }
    }
  }
}))
vi.mock('@/providers/ModalProvider', () => ({
  useModalStore: () => ({ open: vi.fn() })
}))

type PrimitiveProps = {
  as?: ElementType
  children?: ReactNode
  [key: string]: unknown
}

// Preserve real native input/button events; isolate only the styling providers.
vi.mock('@/components/primitives', () => {
  function Primitive({ as = 'div', children, ...props }: PrimitiveProps) {
    return createElement(
      as,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|on[A-Z]|className$|value$|readOnly$|disabled$|type$|autoFocus$)/.test(
            key
          )
        )
      ),
      children
    )
  }

  return {
    Box: Primitive,
    Flex: Primitive,
    Stack: Primitive,
    Text: Primitive,
    Icon: () => createElement('span', { 'aria-hidden': true })
  }
})
vi.mock('@/components/inputs', () => ({
  Button: ({
    children,
    disabled,
    loading,
    onClick,
    autoFocus
  }: {
    children?: ReactNode
    disabled?: boolean
    loading?: boolean
    onClick?: () => void
    autoFocus?: boolean
  }) =>
    createElement(
      'button',
      { type: 'button', disabled: disabled || loading, onClick, autoFocus },
      children
    )
}))
vi.mock('./BlockFrame', () => ({
  CanvasBlockFrame: ({
    block,
    editing,
    onChange
  }: {
    block: CanvasBlock
    editing: boolean
    onChange: (block: CanvasBlock) => void
  }) =>
    createElement('textarea', {
      'aria-label': 'blockContent',
      readOnly: !editing,
      value: block.content,
      onChange: (event: { target: { value: string } }) =>
        onChange({ ...block, content: event.target.value })
    })
}))
vi.mock('./BlockMenu', () => ({ CanvasBlockMenu: () => null }))
vi.mock('@/components/overlays', () => ({ FloatingPopover: () => null }))
vi.mock('@/components/overlays/PopoverButton', () => ({
  PopoverButton: () => null
}))
vi.mock('./InlineDatabasePicker', () => ({ InlineDatabasePicker: () => null }))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function page(content = 'Saved body', revision = 1): CanvasPage {
  return {
    version: 1,
    title: 'Saved page',
    icon: 'lucide:file-text',
    fullWidth: false,
    revision,
    updated: '2026-10-13T12:00:00.000Z',
    blocks: [
      {
        id: 'ab43cf5e-e47b-4b54-a40e-9d6e2330bcbf',
        type: 'document',
        width: 'full',
        title: '',
        content,
        url: '',
        widget: ''
      }
    ]
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

let container: HTMLDivElement
let root: Root
let client: QueryClient
let router: ReturnType<typeof createMemoryRouter>

beforeEach(() => {
  vi.useFakeTimers()

  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity }
    }
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  router.dispose()
  client.clear()
  container.remove()

  vi.useRealTimers()
})

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function mount(
  storage: CanvasPageStorage,
  translationNamespace?: string
) {
  router = createMemoryRouter(
    [
      {
        path: translationNamespace ? '/personalization' : '/page/:id',
        element: (
          <WorkspaceCanvas
            native={null}
            storage={storage}
            title="Fixture"
            translationNamespace={translationNamespace}
          />
        )
      },
      { path: '/away', element: <p>Away</p> }
    ],
    {
      initialEntries: [
        translationNamespace
          ? '/personalization'
          : '/page/9e19626b-e46f-41f4-9b0d-e76d6ac8fe88'
      ]
    }
  )
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
  )
  await settle()
}

function body() {
  const input = container.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="blockContent"]'
  )

  expect(input).not.toBeNull()

  return input!
}

async function editBody(content: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )!.set!.call(body(), content)
    body().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    button => button.textContent === label
  )

  expect(button, `Expected button ${label}`).toBeDefined()
  await act(async () => button!.click())
  await settle()
}

async function autosave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800)
  })
  await settle()
}

function unloadIsBlocked() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)

  return event.defaultPrevented
}

describe('Workspace canvas persistence and recovery', () => {
  it('uses the system namespace for a built-in page title', async () => {
    await mount(
      {
        queryKey: contract.queryKey,
        load: async () => ({ page: null }),
        save: async draft => ({ page: draft })
      },
      'common.personalization'
    )

    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="pageTitle"]')
        ?.value
    ).toBe('Personalization')
  })

  it('preserves newer typing and the returned revision when metadata refresh fails', async () => {
    const firstSave = deferred<{ page: CanvasPage }>()
    const save = vi
      .fn<(draft: CanvasPage) => Promise<{ page: CanvasPage }>>()
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementation(async draft => ({
        page: { ...draft, revision: draft.revision + 1 }
      }))
    const onSaved = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Metadata unavailable'))
      .mockResolvedValue(undefined)

    await mount({
      queryKey: contract.queryKey,
      load: async () => ({ page: page() }),
      save,
      onSaved
    })
    await editBody('Submitted body')
    await autosave()
    expect(save).toHaveBeenCalledTimes(1)
    await editBody('Newer body typed during saving')
    await autosave()
    expect(save).toHaveBeenCalledTimes(1)

    await act(async () =>
      firstSave.resolve({ page: page('Submitted body', 2) })
    )
    await settle()

    expect(body().value).toBe('Newer body typed during saving')
    expect(container.textContent).toContain('refreshFailed')
    expect(unloadIsBlocked()).toBe(true)
    await click('savePage')

    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1][0].revision).toBe(2)
    expect(save.mock.calls[1][0].blocks[0].content).toBe(
      'Newer body typed during saving'
    )
    expect(body().value).toBe('Newer body typed during saving')
    expect(unloadIsBlocked()).toBe(false)
    expect(
      client.getQueryData<{ page: CanvasPage }>(contract.queryKey)?.page
        .revision
    ).toBe(3)
  })

  it('keeps a dirty editor and its navigation guard after a cached refetch fails', async () => {
    const load = vi
      .fn<() => Promise<{ page: CanvasPage | null }>>()
      .mockResolvedValueOnce({ page: page() })
      .mockRejectedValue(new Error('Temporary connection failure'))

    await mount({
      queryKey: contract.queryKey,
      load,
      save: async draft => ({ page: { ...draft, revision: 2 } })
    })
    await editBody('Unsaved draft')
    await act(async () => {
      await client.refetchQueries({ queryKey: contract.queryKey })
    })
    await settle()

    expect(body().value).toBe('Unsaved draft')
    expect(body().readOnly).toBe(false)
    expect(container.textContent).toContain('Temporary connection failure')
    expect(unloadIsBlocked()).toBe(true)
    await act(async () => {
      await router.navigate('/away')
    })

    expect(router.state.location.pathname).not.toBe('/away')
    expect(body().value).toBe('Unsaved draft')
    await click('keepEditing')
    expect(unloadIsBlocked()).toBe(true)
  })

  it('confirms discard inline and locks editing until the saved page reloads', async () => {
    const reload = deferred<{ page: CanvasPage | null }>()
    const load = vi
      .fn<() => Promise<{ page: CanvasPage | null }>>()
      .mockResolvedValueOnce({ page: page() })
      .mockImplementationOnce(() => reload.promise)

    await mount({
      queryKey: contract.queryKey,
      load,
      save: async () => {
        throw new Error('Revision conflict')
      }
    })
    await editBody('Conflicting draft')
    await autosave()
    await click('reloadSaved')

    expect(container.textContent).toContain('reloadConfirm')
    expect(load).toHaveBeenCalledTimes(1)
    await click('keepEditing')
    expect(body().value).toBe('Conflicting draft')
    expect(container.textContent).not.toContain('reloadConfirm')
    await click('reloadSaved')
    await click('discard')

    expect(body().readOnly).toBe(true)
    expect(body().value).toBe('Conflicting draft')
    await act(async () =>
      reload.resolve({ page: page('Latest saved body', 3) })
    )
    await settle()

    expect(body().value).toBe('Latest saved body')
    expect(body().readOnly).toBe(false)
    expect(container.textContent).not.toContain('Revision conflict')
    expect(unloadIsBlocked()).toBe(false)
  })

  it('retains the editable draft and pauses automatic retry when discard reload fails', async () => {
    const load = vi
      .fn<() => Promise<{ page: CanvasPage | null }>>()
      .mockResolvedValueOnce({ page: page() })
      .mockRejectedValue(new Error('Reload unavailable'))
    const save = vi.fn(async () => {
      throw new Error('Revision conflict')
    })

    await mount({ queryKey: contract.queryKey, load, save })
    await editBody('Draft to preserve')
    await autosave()
    await click('reloadSaved')
    await click('discard')

    expect(body().value).toBe('Draft to preserve')
    expect(body().readOnly).toBe(false)
    expect(container.textContent).toContain('Reload unavailable')
    expect(unloadIsBlocked()).toBe(true)
    await autosave()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('uses an already loaded page without a second initial request', async () => {
    const load = vi.fn(async () => ({ page: page('Fetched again') }))

    await mount({
      queryKey: contract.queryKey,
      initialPage: page('Seeded page body'),
      initialDataUpdatedAt: 1,
      load,
      save: async draft => ({ page: draft })
    })

    expect(body().value).toBe('Seeded page body')
    expect(load).not.toHaveBeenCalled()
    expect(client.getQueryState(contract.queryKey)?.dataUpdatedAt).toBe(1)
  })
})
