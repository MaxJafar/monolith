// @vitest-environment jsdom
import {
  type ElementType,
  type ReactNode,
  act,
  createElement,
  createRef
} from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InputWrapper } from './index'

vi.mock('@/components/primitives', () => {
  function Primitive({
    as = 'div',
    children,
    ...props
  }: {
    as?: ElementType
    children?: ReactNode
    [key: string]: unknown
  }) {
    return createElement(
      as,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|on[A-Z]|ref$|role$|tabIndex$)/.test(key)
        )
      ),
      children
    )
  }
  return {
    Box: Primitive,
    Flex: Primitive,
    Text: Primitive,
    Icon: () => null,
    Transition: ({ children }: { children: ReactNode }) => children
  }
})
vi.mock('@/system', () => ({ surface: { lightInteractive: {} } }))
vi.mock('./InputWrapper.css', () => ({
  inputWrapperRecipe: () => '',
  inputWrapperErrorTextStyle: ''
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('input wrapper native interactions', () => {
  it('leaves Enter in textareas and input fields to the native control', async () => {
    const ref = createRef<HTMLTextAreaElement>()
    await act(async () =>
      root.render(
        <InputWrapper inputRef={ref}>
          <textarea ref={ref} />
        </InputWrapper>
      )
    )
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    })
    await act(async () => ref.current!.dispatchEvent(enter))
    expect(enter.defaultPrevented).toBe(false)
  })
  it('does not steal focus when clicking an icon inside an action button', async () => {
    const ref = createRef<HTMLInputElement>()
    await act(async () =>
      root.render(
        <InputWrapper inputRef={ref}>
          <input ref={ref} />
          <button>
            <svg />
          </button>
        </InputWrapper>
      )
    )
    const focus = vi.spyOn(ref.current!, 'focus')
    const button = host.querySelector('button')!
    await act(async () => {
      button.focus()
      button
        .querySelector('svg')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(document.activeElement).toBe(button)
    expect(focus).not.toHaveBeenCalled()
  })
  it('focuses a number field without trying unsupported text selection', async () => {
    const ref = createRef<HTMLInputElement>()
    await act(async () =>
      root.render(
        <InputWrapper inputRef={ref}>
          <input type="number" ref={ref} />
          <span>Amount</span>
        </InputWrapper>
      )
    )
    const selection = vi.spyOn(ref.current!, 'setSelectionRange')
    await act(async () => host.querySelector<HTMLElement>('[role="button"] > span')!.click())
    expect(document.activeElement).toBe(ref.current)
    expect(selection).not.toHaveBeenCalled()
  })
})
