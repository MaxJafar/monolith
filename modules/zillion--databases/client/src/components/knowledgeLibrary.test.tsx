// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ElementType, type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  KnowledgeSearch,
  KnowledgeLibrary as Library
} from '../../../knowledgeLibraryShared'
import { KnowledgeLibrary } from './KnowledgeLibrary'

const api = vi.hoisted(() => ({
  workspaces: vi.fn(),
  snapshot: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  removeCollection: vi.fn(),
  search: vi.fn(),
  workspaceKey: ['fixture-contract', 'workspaces'],
  snapshotKey: (workspace: string) => [
    'fixture-contract',
    'knowledgeLibrary',
    'snapshot',
    workspace
  ]
}))
vi.mock('@lifeforge/api', () => ({
  useAuth: () => ({ userData: { id: 'fixture-actor' } })
}))
vi.mock('@lifeforge/localization', () => ({
  useModuleTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/manifest', () => ({
  forgeAPI: {
    workspaces: {
      list: {
        queryOptions: () => ({
          queryKey: api.workspaceKey,
          queryFn: api.workspaces,
          retry: false,
          staleTime: Infinity
        })
      }
    },
    knowledgeLibrary: {
      snapshot: {
        input: (input: { workspace_id: string }) => ({
          queryOptions: () => ({
            queryKey: api.snapshotKey(input.workspace_id),
            queryFn: () => api.snapshot(input),
            retry: false
          })
        })
      },
      createCollection: {
        input: (input: unknown) => ({
          mutate: (body: unknown) => api.create(input, body)
        })
      },
      updateCollection: {
        input: (input: unknown) => ({
          mutate: (body: unknown) => api.update(input, body)
        })
      },
      addSource: {
        input: (input: unknown) => ({
          mutate: (body: unknown) => api.add(input, body)
        })
      },
      removeSource: {
        input: (input: unknown) => ({
          mutate: (body: unknown) => api.remove(input, body)
        })
      },
      removeCollection: {
        input: (input: unknown) => ({
          mutate: (body: unknown) => api.removeCollection(input, body)
        })
      },
      search: {
        input: (input: unknown) => ({
          mutate: (body: unknown) => api.search(input, body)
        })
      }
    }
  }
}))

type PrimitiveProps = {
  as?: ElementType
  children?: ReactNode
  [key: string]: unknown
}
// Keep router, query cache, native events and real draft guards; mock only styling widgets.
vi.mock('@lifeforge/ui', () => {
  function Primitive({ as = 'div', children, ...props }: PrimitiveProps) {
    return createElement(
      as,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|on[A-Z]|className$|disabled$|type$|accept$|value$|role$|required$)/.test(
            key
          )
        )
      ),
      children
    )
  }

  return {
    Box: Primitive,
    Stack: Primitive,
    Flex: Primitive,
    Text: Primitive,
    Card: Primitive,
    Button: ({
      as = 'button',
      children,
      disabled,
      loading,
      to,
      type = 'button',
      onClick,
      ...props
    }: PrimitiveProps & {
      disabled?: boolean
      loading?: boolean
      type?: string
      to?: string
      onClick?: () => void
    }) =>
      createElement(
        as,
        {
          to,
          type,
          disabled: disabled || loading,
          onClick,
          ...Object.fromEntries(
            Object.entries(props).filter(([key]) => key.startsWith('aria-'))
          )
        },
        children
      ),
    TextInput: ({
      label,
      value,
      onChange,
      disabled,
      required
    }: {
      label: string
      value: string
      onChange: (value: string) => void
      disabled?: boolean
      required?: boolean
    }) =>
      createElement('input', {
        'aria-label': label,
        value,
        disabled,
        required,
        onInput: (event: React.FormEvent<HTMLInputElement>) =>
          onChange(event.currentTarget.value)
      }),
    TextAreaInput: ({
      label,
      value,
      onChange,
      disabled,
      required
    }: {
      label: string
      value: string
      onChange: (value: string) => void
      disabled?: boolean
      required?: boolean
    }) =>
      createElement('textarea', {
        'aria-label': label,
        value,
        disabled,
        required,
        onInput: (event: React.FormEvent<HTMLTextAreaElement>) =>
          onChange(event.currentTarget.value)
      }),
    ListboxInput: ({
      label,
      value,
      onChange,
      disabled,
      children
    }: {
      label: string
      value: string
      onChange: (value: string) => void
      disabled?: boolean
      children?: ReactNode
    }) =>
      createElement(
        'select',
        {
          'aria-label': label,
          value,
          disabled,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onChange(event.currentTarget.value)
        },
        children
      ),
    ListboxOption: ({ label, value }: { label: string; value: string }) =>
      createElement('option', { value }, label)
  }
})
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const workspace = '00000000-0000-4000-8000-000000000001',
  secondWorkspace = '00000000-0000-4000-8000-000000000002',
  firstCollection = '00000000-0000-4000-8000-000000000003',
  secondCollection = '00000000-0000-4000-8000-000000000004',
  newCollection = '00000000-0000-4000-8000-000000000005',
  pageId = '00000000-0000-4000-8000-000000000006'
const initial: Library = {
  role: 'editor',
  engine: 'lexical',
  catalog_truncated: false,
  collections: [
    {
      id: firstCollection,
      name: 'Homelab runbooks',
      description: 'Service recovery',
      source_count: 1,
      updated: '2026-10-13T00:00:00.000Z'
    },
    {
      id: secondCollection,
      name: 'Agent policies',
      description: 'Reviewed skills',
      source_count: 0,
      updated: '2026-10-13T00:00:00.000Z'
    }
  ],
  sources: [
    {
      id: '00000000-0000-4000-8000-000000000007',
      collection_id: firstCollection,
      kind: 'page',
      title: 'Minecraft recovery',
      source_id: pageId,
      media_type: null,
      characters: 42,
      chunks: 1,
      updated: '2026-10-13T00:00:00.000Z',
      href: `/page/${pageId}?workspace=${workspace}`
    }
  ],
  catalog: [
    {
      id: pageId,
      kind: 'page',
      title: 'Minecraft recovery',
      href: `/page/${pageId}?workspace=${workspace}`
    }
  ]
}
const evidence: KnowledgeSearch = {
  query: 'Minecraft backup',
  engine: 'lexical',
  answer: '[1] Preserve backups.',
  searched_sources: 1,
  total_chunks: 1,
  citations: [
    {
      id: 'citation',
      source_id: initial.sources[0]!.id,
      collection_id: firstCollection,
      title: 'Minecraft recovery',
      kind: 'page',
      href: initial.sources[0]!.href,
      chunk_index: 0,
      text: 'Preserve backups. <script>unsafe()</script>',
      score: 1,
      updated: '2026-10-13T00:00:00.000Z'
    }
  ]
}

let current: Library,
  container: HTMLDivElement,
  root: Root,
  cache: QueryClient,
  router: ReturnType<typeof createMemoryRouter>
beforeEach(() => {
  vi.clearAllMocks()
  current = structuredClone(initial)
  api.workspaces.mockResolvedValue([
    { id: workspace, name: 'Personal' },
    { id: secondWorkspace, name: 'Collaborative' }
  ])
  api.snapshot.mockImplementation(
    ({ workspace_id }: { workspace_id: string }) =>
      Promise.resolve(
        workspace_id === workspace
          ? current
          : {
              ...initial,
              role: 'viewer',
              collections: [],
              sources: [],
              catalog: []
            }
      )
  )
  api.search.mockResolvedValue(evidence)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } }
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  router.dispose()
  cache.clear()
  container.remove()
  vi.restoreAllMocks()
})

async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

async function mount(collection = firstCollection) {
  router = createMemoryRouter(
    [{ path: '/databases', Component: KnowledgeLibrary }],
    {
      initialEntries: [
        `/databases?section=library&workspace=${workspace}${collection ? '&collection=' + collection : ''}`
      ]
    }
  )
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(RouterProvider, { router })
      )
    )
  )
  await flush()
}

function button(label: string, submit = false) {
  const result = [
    ...container.querySelectorAll<HTMLButtonElement>('button')
  ].find(
    item => item.textContent === label && (!submit || item.type === 'submit')
  )
  expect(result, label).toBeDefined()

  return result!
}

async function click(label: string, submit = false) {
  await act(async () => button(label, submit).click())
  await flush()
}

async function fill(label: string, value: string) {
  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[aria-label="${label}"]`
  )
  expect(input, label).not.toBeNull()
  await act(async () => {
    input!.value = value
    input!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function select(label: string, value: string) {
  const input = container.querySelector<HTMLSelectElement>(
    `select[aria-label="${label}"]`
  )
  expect(input, label).not.toBeNull()
  await act(async () => {
    input!.value = value
    input!.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await flush()
}

async function refetch() {
  await act(async () => {
    await cache.invalidateQueries({
      queryKey: [...api.snapshotKey(workspace), 'fixture-actor'],
      exact: true
    })
  })
  await flush()
}

describe('Knowledge library forms, permissions, citations and draft navigation', () => {
  it('lets a viewer search the selected collection while hiding write controls and escaping source excerpts', async () => {
    current.role = 'viewer'
    await mount()
    expect(container.textContent).not.toContain('library.newCollection')
    expect(container.textContent).not.toContain('library.editCollection')
    expect(container.textContent).not.toContain('library.addSource')
    expect(container.textContent).not.toContain('buttons.delete')
    await fill('library.searchLabel', '  Minecraft backup  ')
    await click('library.search', true)
    expect(api.search).toHaveBeenCalledWith(
      { workspace_id: workspace },
      { query: 'Minecraft backup', collection_ids: [firstCollection], limit: 8 }
    )
    expect(container.textContent).toContain(evidence.citations[0]!.text)
    expect(container.querySelector('script')).toBeNull()
    expect(
      [...container.querySelectorAll('a')].some(
        item => item.getAttribute('href') === initial.sources[0]!.href
      )
    ).toBe(true)
  })
  it('switches workspace scope and drops the previous workspace search result', async () => {
    await mount()
    await fill('library.searchLabel', 'Minecraft backup')
    await click('library.search', true)
    expect(container.textContent).toContain(evidence.citations[0]!.text)
    await select('workspace', secondWorkspace)
    expect(router.state.location.search).toContain(secondWorkspace)
    expect(router.state.location.search).not.toContain('collection=')
    expect(api.snapshot).toHaveBeenCalledWith({ workspace_id: secondWorkspace })
    expect(container.textContent).not.toContain(evidence.citations[0]!.text)
    await fill('library.searchLabel', 'Shared notes')
    await click('library.search', true)
    expect(api.search).toHaveBeenLastCalledWith(
      { workspace_id: secondWorkspace },
      { query: 'Shared notes', limit: 8 }
    )
  })
  it('preserves a failed collection draft and blocks query-only navigation until the user keeps or discards it', async () => {
    api.create.mockRejectedValue(new Error('Synthetic save failed'))
    await mount()
    await click('library.newCollection')
    await fill('library.collectionName', 'Unsent collection')
    await fill('inputs.description', 'Preserve this draft')
    await click('buttons.save', true)
    expect(container.textContent).toContain('Synthetic save failed')
    expect(
      container.querySelector<HTMLInputElement>(
        '[aria-label="library.collectionName"]'
      )?.value
    ).toBe('Unsent collection')
    await act(async () => {
      await router.navigate(
        `/databases?section=library&workspace=${workspace}&collection=${secondCollection}`
      )
    })
    expect(container.textContent).toContain('docs.unsaved')
    expect(router.state.location.search).toContain(firstCollection)
    await click('docs.keepEditing')
    expect(container.textContent).not.toContain('docs.unsaved')
    expect(
      container.querySelector<HTMLTextAreaElement>(
        '[aria-label="inputs.description"]'
      )?.value
    ).toBe('Preserve this draft')
  })
  it('releases the draft guard before navigating to a successfully created collection', async () => {
    api.create.mockImplementation(
      async (_query, body: { name: string; description: string }) => {
        current = {
          ...current,
          collections: [
            ...current.collections,
            {
              id: newCollection,
              ...body,
              source_count: 0,
              updated: '2026-10-13T00:00:01.000Z'
            }
          ]
        }

        return { id: newCollection }
      }
    )
    await mount()
    await click('library.newCollection')
    await fill('library.collectionName', '  New knowledge  ')
    await click('buttons.save', true)
    expect(api.create).toHaveBeenCalledWith(
      { workspace_id: workspace },
      { name: 'New knowledge', description: '' }
    )
    expect(router.state.location.search).toContain(newCollection)
    expect(
      container.querySelector('[aria-label="library.collectionName"]')
    ).toBeNull()
    expect(container.textContent).not.toContain('docs.unsaved')
  })
  it('links a canonical source with the chosen collection, retains a failed selection and guards workspace changes', async () => {
    api.add.mockRejectedValueOnce(new Error('Synthetic import failed'))
    await mount()
    await click('library.addSource')
    await select('library.linkedSource', `page:${pageId}`)
    await select('library.collection', secondCollection)
    await click('library.addSource', true)
    expect(api.add).toHaveBeenCalledWith(
      { workspace_id: workspace },
      { collection_id: secondCollection, kind: 'page', source_id: pageId }
    )
    expect(
      container.querySelector<HTMLSelectElement>(
        '[aria-label="library.linkedSource"]'
      )?.value
    ).toBe(`page:${pageId}`)
    expect(container.textContent).toContain('Synthetic import failed')
    await select('workspace', secondWorkspace)
    expect(container.textContent).toContain('docs.unsaved')
    expect(router.state.location.search).toContain(workspace)
    await click('docs.keepEditing')
    api.add.mockResolvedValueOnce({ id: 'new-source' })
    await click('library.addSource', true)
    expect(
      container.querySelector('[aria-label="library.linkedSource"]')
    ).toBeNull()
    expect(container.textContent).not.toContain('docs.unsaved')
  })
  it('reads only a bounded local text file and sends Markdown as data, never executable content', async () => {
    api.add.mockResolvedValue({ id: 'imported-source' })
    await mount()
    await click('library.addSource')
    await select('library.sourceType', 'text')
    const upload =
      container.querySelector<HTMLInputElement>('input[type="file"]')!
    const invalid = new File(['%PDF'], 'guide.pdf', { type: 'application/pdf' })
    Object.defineProperty(upload, 'files', {
      configurable: true,
      value: [invalid]
    })
    await act(async () =>
      upload.dispatchEvent(new Event('change', { bubbles: true }))
    )
    expect(container.textContent).toContain('library.fileError')
    expect(api.add).not.toHaveBeenCalled()
    const markdown = '# Recovery\n\n<script>unsafe()</script>\n\nKeep a backup.'
    const file = new File([markdown], 'Recovery.md', { type: 'text/markdown' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(markdown)
    })
    Object.defineProperty(upload, 'files', {
      configurable: true,
      value: [file]
    })
    await act(async () =>
      upload.dispatchEvent(new Event('change', { bubbles: true }))
    )
    await flush()
    expect(
      container.querySelector<HTMLInputElement>(
        '[aria-label="library.sourceTitle"]'
      )?.value
    ).toBe('Recovery')
    expect(
      container.querySelector<HTMLTextAreaElement>(
        '[aria-label="library.sourceContent"]'
      )?.value
    ).toBe(markdown)
    expect(container.querySelector('script')).toBeNull()
    await click('library.addSource', true)
    expect(api.add).toHaveBeenCalledWith(
      { workspace_id: workspace },
      {
        collection_id: firstCollection,
        kind: 'text',
        title: 'Recovery',
        content: markdown,
        media_type: 'text/markdown'
      }
    )
  })
  it('keeps a source draft and its guard when a background refresh removes the selected collection', async () => {
    await mount()
    await click('library.addSource')
    await select('library.sourceType', 'text')
    await fill('library.sourceTitle', 'Retain me')
    await fill('library.sourceContent', 'Important unsaved source')
    current = {
      ...current,
      collections: current.collections.filter(
        item => item.id !== firstCollection
      ),
      sources: []
    }
    await refetch()
    expect(container.textContent).toContain('library.collectionUnavailable')
    expect(
      container.querySelector<HTMLTextAreaElement>(
        '[aria-label="library.sourceContent"]'
      )?.value
    ).toBe('Important unsaved source')
    await act(async () => {
      await router.navigate(
        `/databases?section=library&workspace=${secondWorkspace}`
      )
    })
    expect(container.textContent).toContain('docs.unsaved')
  })
  it('does not carry a collection removal confirmation into another collection', async () => {
    await mount()
    await click('buttons.delete')
    expect(container.textContent).toContain('library.confirmCollectionRemoval')
    await act(async () => {
      await router.navigate(
        `/databases?section=library&workspace=${workspace}&collection=${secondCollection}`
      )
    })
    await flush()
    expect(router.state.location.search).toContain(secondCollection)
    expect(container.textContent).not.toContain(
      'library.confirmCollectionRemoval'
    )
    expect(api.removeCollection).not.toHaveBeenCalled()
  })
  it('preserves a draft after a role downgrade while disabling edits and keeping Cancel available', async () => {
    await mount()
    await click('library.addSource')
    await select('library.sourceType', 'text')
    await fill('library.sourceTitle', 'Retained viewer draft')
    await fill('library.sourceContent', 'Preserved when permission changes')
    current = { ...current, role: 'viewer' }
    await refetch()
    const field = container.querySelector<HTMLTextAreaElement>(
      '[aria-label="library.sourceContent"]'
    )!
    expect(field.value).toBe('Preserved when permission changes')
    expect(field.matches(':disabled')).toBe(true)
    expect(button('library.addSource', true).matches(':disabled')).toBe(true)
    expect(button('buttons.cancel').matches(':disabled')).toBe(false)
    await act(async () => {
      await router.navigate(
        `/databases?section=library&workspace=${secondWorkspace}`
      )
    })
    expect(container.textContent).toContain('docs.unsaved')
    await click('docs.keepEditing')
    await click('buttons.cancel')
    expect(
      container.querySelector('[aria-label="library.sourceContent"]')
    ).toBeNull()
    expect(api.add).not.toHaveBeenCalled()
  })
  it('treats an import as committed even if the following metadata refresh fails', async () => {
    api.add.mockResolvedValue({ id: 'committed-source' })
    await mount()
    await click('library.addSource')
    await select('library.linkedSource', `page:${pageId}`)
    api.snapshot.mockRejectedValueOnce(new Error('Synthetic refresh failed'))
    await click('library.addSource', true)
    expect(api.add).toHaveBeenCalledTimes(1)
    expect(
      container.querySelector('[aria-label="library.linkedSource"]')
    ).toBeNull()
    expect(container.textContent).toContain('library.refreshWarning')
    expect(container.textContent).toContain('Synthetic refresh failed')
    expect(container.textContent).not.toContain('docs.unsaved')
  })
})
