// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createMemoryRouter,
  useLocation,
  useNavigate
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DraftNotice, useDraftGuard } from './useDraftGuard'

vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@monolith/ui', () => ({
  Button: ({
    children,
    onClick,
    autoFocus
  }: {
    children: React.ReactNode
    onClick: () => void
    autoFocus?: boolean
  }) => createElement('button', { onClick, autoFocus }, children),
  Card: ({ children, role }: { children: React.ReactNode; role?: string }) =>
    createElement('div', { role }, children),
  Flex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  Text: ({ children }: { children: React.ReactNode }) =>
    createElement('span', null, children)
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function Editor() {
  const [dirty, setDirty] = useState(true)
  const { blocker, allowNavigation } = useDraftGuard(dirty)
  const navigate = useNavigate()
  const location = useLocation()

  return createElement(
    'div',
    null,
    createElement(DraftNotice, { blocker }),
    createElement(
      'button',
      { onClick: () => navigate('/databases?base=a') },
      'leave'
    ),
    createElement(
      'button',
      {
        onClick: () => navigate('/databases?base=a')
      },
      'back'
    ),
    createElement(
      'button',
      {
        onClick: () => {
          allowNavigation()
          setDirty(false)
        }
      },
      'save without navigation'
    ),
    createElement('button', { onClick: () => setDirty(true) }, 'edit again'),
    createElement(
      'button',
      {
        onClick: () => navigate({ search: location.search, hash: '#content' })
      },
      'same page anchor'
    )
  )
}

let container: HTMLDivElement
let root: Root
let router: ReturnType<typeof createMemoryRouter>

async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    button => button.textContent === label
  )

  expect(button, label).toBeDefined()
  await act(async () => button!.click())
}

beforeEach(async () => {
  container = document.createElement('div')
  document.body.append(container)
  router = createMemoryRouter([{ path: '/databases', Component: Editor }], {
    initialEntries: ['/databases?base=a&record=launch']
  })
  root = createRoot(container)
  await act(async () => root.render(createElement(RouterProvider, { router })))
})

afterEach(async () => {
  await act(async () => root.unmount())
  router.dispose()
  container.remove()
})

describe('Record and relation draft navigation guard', () => {
  it('blocks navigation and lets the user keep editing or discard the draft', async () => {
    await click('leave')
    expect(router.state.location.search).toContain('record=launch')
    expect(document.activeElement?.textContent).toBe('docs.keepEditing')
    await click('docs.keepEditing')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await click('leave')
    await click('docs.discard')
    expect(router.state.location.search).toBe('?base=a')
  })

  it('uses the same in-app blocker for Back and leaves only after Discard', async () => {
    await click('back')
    expect(router.state.location.search).toContain('record=launch')
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    await click('docs.keepEditing')
    expect(router.state.location.search).toContain('record=launch')
    await click('back')
    await click('docs.discard')
    expect(router.state.location.search).toBe('?base=a')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('protects the next dirty draft after saving on the current route', async () => {
    await click('save without navigation')
    await click('edit again')
    await click('leave')
    expect(router.state.location.search).toContain('record=launch')
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('guards refresh only while dirty, without blocking in-page anchors', async () => {
    const dirtyUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyUnload)
    expect(dirtyUnload.defaultPrevented).toBe(true)
    await click('same page anchor')
    expect(router.state.location.hash).toBe('#content')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await click('save without navigation')
    const savedUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(savedUnload)
    expect(savedUnload.defaultPrevented).toBe(false)
  })
})
