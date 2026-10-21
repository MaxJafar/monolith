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
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Button } from './index'

const translate = vi.hoisted(() =>
  vi.fn(
    (_keys: unknown, options: { defaultValue: string }) => options.defaultValue
  )
)
vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({ t: translate })
}))
vi.mock('@/utils/elasticMotion', () => ({ settleElement: () => {} }))
vi.mock('@/components/primitives', () => {
  function Primitive({
    as = 'div',
    asChild,
    children,
    ...props
  }: Record<string, unknown>) {
    const attrs = Object.fromEntries(
      Object.entries(props).filter(([key]) =>
        /^(on[A-Z]|aria-|data-|ref$|id$|className$|disabled$|href$|type$|tabIndex$|style$)/.test(
          key
        )
      )
    )
    return asChild
      ? cloneElement(children as ReactElement, attrs)
      : createElement(as as string, attrs, children as ReactNode)
  }
  return {
    Box: Primitive,
    Flex: Primitive,
    Text: Primitive,
    Icon: ({ icon }: { icon: string }) => <svg data-icon={icon} />
  }
})
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  translate.mockClear()
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
it('preserves button text and width while announcing pending work', async () => {
  await act(async () => root.render(<Button loading>Publish release</Button>))
  const button = container.querySelector('button')!
  expect(button.disabled).toBe(true)
  expect(button.getAttribute('aria-busy')).toBe('true')
  expect(button.textContent).toBe('Publish release')
  expect(
    button
      .querySelector('[data-loading-indicator]')!
      .getAttribute('aria-hidden')
  ).toBe('true')
  expect(
    button.querySelector('[data-icon="svg-spinners:ring-resize"]')
  ).not.toBeNull()
})
it.each([{ disabled: true }, { loading: true }])(
  'blocks disabled polymorphic links and parent clicks (%j)',
  async state => {
    const click = vi.fn(),
      parent = vi.fn()
    await act(async () =>
      root.render(
        <div onClick={parent}>
          <Button as="a" href="#next" onClick={click} {...state}>
            Continue
          </Button>
        </div>
      )
    )
    const anchor = container.querySelector('a')!
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    await act(async () => anchor.dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(anchor.tabIndex).toBe(-1)
    expect(click).not.toHaveBeenCalled()
    expect(parent).not.toHaveBeenCalled()
  }
)
it('restores activation and the configured icon after loading', async () => {
  const click = vi.fn()
  await act(async () =>
    root.render(
      <Button icon="tabler:check" loading onClick={click}>
        Save
      </Button>
    )
  )
  await act(async () =>
    root.render(
      <Button icon="tabler:check" onClick={click}>
        Save
      </Button>
    )
  )
  await act(async () => container.querySelector('button')!.click())
  expect(click).toHaveBeenCalledOnce()
  expect(container.querySelector('[data-icon="tabler:check"]')).not.toBeNull()
  expect(container.querySelector('[aria-busy]')).toBeNull()
})
it('defaults to non-submitting buttons while preserving explicit submit semantics', async () => {
  await act(async () =>
    root.render(
      <>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </>
    )
  )
  expect(
    [...container.querySelectorAll('button')].map(button => button.type)
  ).toEqual(['button', 'submit'])
})
it('keeps literal labels when localization is disabled', async () => {
  await act(async () =>
    root.render(
      <Button namespace={false} icon="tabler:book" iconPosition="end">
        Custom label
      </Button>
    )
  )
  expect(translate).not.toHaveBeenCalled()
  expect(
    container
      .querySelector('button')!
      .lastElementChild!.getAttribute('data-icon')
  ).toBe('tabler:book')
})

it('includes the explicit add-on namespace even inside a different metadata scope', async () => {
  await act(async () =>
    root.render(<Button namespace="apps.achievements">newAchievement</Button>)
  )
  expect(translate.mock.calls[0][0]).toContain(
    'apps.achievements:buttons.newAchievement'
  )
  expect(translate.mock.calls[0][0]).toContain(
    'apps.achievements:newAchievement'
  )
})
