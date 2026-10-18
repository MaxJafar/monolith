// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { Slot } from './index'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('Slot composition', () => {
  it('composes refs, honors cancelled child actions and releases both refs', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const outerRef = createRef<HTMLButtonElement>()
    const release = vi.fn()
    const innerRef = vi.fn(() => release)
    const outerClick = vi.fn()
    try {
      await act(async () =>
        root.render(
          <Slot
            ref={outerRef}
            onClick={outerClick}
            className="outer"
            style={{ color: 'red' }}
          >
            <button
              ref={innerRef}
              className="inner"
              style={{ background: 'blue' }}
              onClick={event => event.preventDefault()}
            >
              Open
            </button>
          </Slot>
        )
      )
      const button = host.querySelector('button')!
      expect(outerRef.current).toBe(button)
      expect(innerRef).toHaveBeenCalledWith(button)
      expect(button.className).toBe('inner outer')
      expect(button.style.background).toBe('blue')
      await act(async () => button.click())
      expect(outerClick).not.toHaveBeenCalled()
    } finally {
      await act(async () => root.unmount())
    }
    expect(release).toHaveBeenCalledOnce()
    expect(outerRef.current).toBeNull()
  })
})
