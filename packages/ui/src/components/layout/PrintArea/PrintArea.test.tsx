// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act, createRef } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PrintArea, collectPrintVariables } from './index'

vi.mock('@/providers', () => ({
  usePersonalization: () => ({
    derivedTheme: 'light',
    bordered: false,
    bgTemp: 'bg-zillion',
    rootElement: document.body,
    borderRadiusMultiplier: 1.5
  })
}))
let root: Root, host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
  vi.unstubAllGlobals()
})
it('copies only custom properties and honors the inner theme override', () => {
  document.documentElement.style.setProperty('--brand-color', '#123456')
  document.documentElement.style.pointerEvents = 'none'
  document.body.style.setProperty('--brand-color', '#654321')
  document.body.style.backgroundColor = 'red'
  expect(
    collectPrintVariables([document.documentElement, document.body])
  ).toEqual({ '--brand-color': '#654321' })
})
it('keeps print styles scoped and refreshes theme variables before printing', async () => {
  const ref = createRef<HTMLDivElement>()
  document.documentElement.style.setProperty('--brand-color', '#123456')
  await act(async () =>
    root.render(
      <PrintArea contentRef={ref} style={{ fontFamily: 'serif' }}>
        Statement
      </PrintArea>
    )
  )
  expect(ref.current!.style.getPropertyValue('--brand-color')).toBe('#123456')
  expect(
    ref.current!.style.getPropertyValue('--custom-border-radius-multiplier')
  ).toBe('1.5')
  expect(host.querySelector('style')).toBeNull()
  expect(
    document.documentElement.style.getPropertyValue('--custom-font-scale')
  ).toBe('')
  await act(async () => {
    document.documentElement.style.setProperty('--brand-color', '#abcdef')
    window.dispatchEvent(new Event('beforeprint'))
  })
  expect(ref.current!.style.getPropertyValue('--brand-color')).toBe('#abcdef')
  expect(ref.current!.style.fontFamily).toBe('serif')
})
