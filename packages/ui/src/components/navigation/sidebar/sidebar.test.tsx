// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import {
  type ReactElement,
  type ReactNode,
  act,
  cloneElement,
  createElement
} from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { MainSidebarItem } from './MainSidebarItem'
import { SidebarItem } from './SidebarItem'

const close = vi.hoisted(() => vi.fn())
vi.mock('@/providers', () => ({
  useModuleSidebarState: () => ({ setIsSidebarOpen: close })
}))
vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({
    t: (_: unknown, options: { defaultValue: string }) => options.defaultValue
  })
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/components/primitives', () => {
  function Primitive({
    as = 'div',
    asChild,
    children,
    ...props
  }: Record<string, unknown>) {
    const attrs = Object.fromEntries(
      Object.entries(props).filter(([key]) =>
        /^(aria-|data-|on[A-Z]|className$|role$|id$|type$|hidden$|src$|alt$|style$)/.test(
          key
        )
      )
    )
    return asChild
      ? cloneElement(children as ReactElement, attrs)
      : createElement(as as string, attrs, children as ReactNode)
  }
  return { Box: Primitive, Flex: Primitive, Text: Primitive, Icon: () => null }
})
vi.mock('@/components/inputs', () => ({
  Button: ({ onClick, children, ...props }: Record<string, unknown>) => (
    <button
      type="button"
      onClick={onClick as React.MouseEventHandler}
      {...Object.fromEntries(
        Object.entries(props).filter(([key]) => key.startsWith('aria-'))
      )}
    >
      {children as ReactNode}
    </button>
  )
}))
vi.mock('@/components/overlays', () => ({
  ContextMenu: ({ children }: { children: ReactNode }) => (
    <button type="button" aria-label="More">
      {children}
    </button>
  )
}))
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  close.mockClear()
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
it('keeps row navigation separate from action, cancel and context controls', async () => {
  const nav = vi.fn(),
    action = vi.fn(),
    cancel = vi.fn()
  await act(async () =>
    root.render(
      <ul>
        <SidebarItem
          label="Research"
          namespace={false}
          active
          onClick={nav}
          onCancelButtonClick={cancel}
          actionButtonProps={{ icon: 'tabler:plus', onClick: action }}
          contextMenuItems={<span>Rename</span>}
        />
      </ul>
    )
  )
  expect(container.querySelectorAll('button button')).toHaveLength(0)
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="itemAction"]')!
      .click()
  )
  expect(action).toHaveBeenCalledOnce()
  expect(nav).not.toHaveBeenCalled()
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="clearSelection"]')!
      .click()
  )
  expect(cancel).toHaveBeenCalledOnce()
  expect(nav).not.toHaveBeenCalled()
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('.monolith-sidebar-select')!
      .click()
  )
  expect(nav).toHaveBeenCalledOnce()
})
it('expands nested choices without closing the mobile drawer and exposes selection/counts', async () => {
  const nav = vi.fn()
  await act(async () =>
    root.render(
      <ul>
        <SidebarItem
          label="Library"
          namespace={false}
          onClick="expand"
          subsection={[
            {
              label: 'Design',
              icon: 'tabler:folder',
              namespace: false,
              active: true,
              amount: 0,
              onClick: nav
            }
          ]}
        />
      </ul>
    )
  )
  const trigger = container.querySelector<HTMLButtonElement>(
    '.monolith-sidebar-select'
  )!
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(
    document.getElementById(trigger.getAttribute('aria-controls')!)!
      .parentElement!.hidden
  ).toBe(true)
  await act(async () => trigger.click())
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  expect(close).not.toHaveBeenCalled()
  const child = container.querySelector<HTMLButtonElement>(
    '[aria-current="page"]'
  )!
  expect(child.textContent).toContain('0')
  await act(async () => child.click())
  expect(nav).toHaveBeenCalledOnce()
  expect(close).toHaveBeenCalledWith(false)
})
it('uses an image context for custom SVG instead of injecting markup', async () => {
  await act(async () =>
    root.render(
      <ul>
        <SidebarItem
          label="Safe icon"
          namespace={false}
          icon={
            'customHTML:<svg xmlns="http://www.w3.org/2000/svg"><script>evil()</script></svg>'
          }
        />
      </ul>
    )
  )
  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('img')!.getAttribute('src')).toMatch(
    /^data:image\/svg\+xml/
  )
})
it('derives route selection and keeps a collapsed item named', async () => {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={['/projects/alpha']}>
        <ul>
          <MainSidebarItem
            autoActive
            label="Projects"
            icon="tabler:folder"
            link="/projects"
            sidebarExpanded={false}
            toggleSidebar={() => {}}
          />
        </ul>
      </MemoryRouter>
    )
  )
  const item = container.querySelector('button')!
  expect(item.getAttribute('aria-current')).toBe('page')
  expect(item.getAttribute('aria-label')).toBe('Projects')
})
