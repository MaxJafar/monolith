// @vitest-environment jsdom
import { type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Button } from './index'

vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({ t: () => 'Save' })
}))
vi.mock('./Button.css', () => ({ buttonRecipe: () => '' }))
vi.mock('./hooks/useButtonStyleProps', () => ({
  useButtonStyleProps: ({ props }: { props: Record<string, unknown> }) => ({
    restProps: props
  })
}))
vi.mock('./components/ButtonIcon', () => ({
  ButtonIcon: () => createElement('svg', { 'data-testid': 'spinner' })
}))
// Keep the real Button's events and attributes while isolating its style providers.
vi.mock('@/components/primitives', () => ({
  Transition: ({ children }: { children: ReactNode }) => children,
  Text: ({ children }: { children: ReactNode }) => children,
  Box: ({ children }: { children: ReactNode }) => children,
  Flex: ({
    as = 'div',
    children,
    ...props
  }: {
    as?: string
    children: ReactNode
    [key: string]: unknown
  }) =>
    createElement(
      as,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|onClick$|disabled$|href$|type$|style$)/.test(key)
        )
      ),
      children
    )
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('Shared Button interaction states', () => {
  it('shows a spinner without a configured icon and keeps its accessible text', async () => {
    await act(async () => root.render(<Button loading>Save</Button>))
    const button = container.querySelector('button')!

    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.textContent).toBe('Save')
    expect(button.querySelector('[data-testid="spinner"]')).not.toBeNull()
    expect(
      button
        .querySelector('[data-loading-indicator]')
        ?.getAttribute('aria-hidden')
    ).toBe('true')
  })

  it.each([{ disabled: true }, { loading: true }])(
    'prevents link navigation and parent activation when %j',
    async state => {
      const activate = vi.fn()
      const parent = vi.fn()
      await act(async () =>
        root.render(
          <div onClick={parent}>
            <Button as="a" href="#destination" onClick={activate} {...state}>
              Save
            </Button>
          </div>
        )
      )
      const link = container.querySelector('a')!
      const click = new MouseEvent('click', { bubbles: true, cancelable: true })
      await act(async () => link.dispatchEvent(click))

      expect(link.getAttribute('aria-disabled')).toBe('true')
      expect(click.defaultPrevented).toBe(true)
      expect(activate).not.toHaveBeenCalled()
      expect(parent).not.toHaveBeenCalled()
    }
  )

  it('restores activation when pending work finishes', async () => {
    const activate = vi.fn()
    await act(async () =>
      root.render(
        <Button loading onClick={activate}>
          Save
        </Button>
      )
    )
    await act(async () => root.render(<Button onClick={activate}>Save</Button>))
    const button = container.querySelector('button')!
    await act(async () => button.click())

    expect(button.disabled).toBe(false)
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(button.querySelector('[data-testid="spinner"]')).toBeNull()
    expect(activate).toHaveBeenCalledOnce()
  })
})
