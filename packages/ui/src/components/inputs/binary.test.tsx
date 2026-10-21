// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act, useState } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Checkbox } from './Checkbox'
import { Switch } from './Switch'

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
  vi.unstubAllGlobals()
})
it('submits a named checkbox and toggles through its visible label', async () => {
  function Form() {
    const [checked, onCheckedChange] = useState(false)
    return (
      <form>
        <Checkbox
          name="complete"
          value="yes"
          label="Complete action"
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </form>
    )
  }
  await act(async () => root.render(<Form />))
  expect(new FormData(host.querySelector('form')!).has('complete')).toBe(false)
  await act(async () => host.querySelector('label')!.click())
  expect(host.querySelector('input')!.checked).toBe(true)
  expect(new FormData(host.querySelector('form')!).get('complete')).toBe('yes')
})
it('keeps disabled checkboxes and switches unchanged', async () => {
  const change = vi.fn()
  await act(async () =>
    root.render(
      <>
        <Checkbox disabled checked onCheckedChange={change} label="Locked" />
        <Switch
          disabled
          value={false}
          onChange={change}
          aria-label="Notifications"
        />
      </>
    )
  )
  await act(async () => {
    host.querySelector('input')!.click()
    host.querySelector('button')!.click()
  })
  expect(change).not.toHaveBeenCalled()
  expect(host.querySelector('input')!.checked).toBe(true)
})
it('exposes switch state without submitting a surrounding form', async () => {
  const submit = vi.fn()
  function Form() {
    const [value, onChange] = useState(false)
    return (
      <form onSubmit={submit}>
        <Switch value={value} onChange={onChange} aria-label="Notifications" />
      </form>
    )
  }
  await act(async () => root.render(<Form />))
  const button = host.querySelector('button')!
  expect(button.getAttribute('role')).toBe('switch')
  await act(async () => button.click())
  expect(button.getAttribute('aria-checked')).toBe('true')
  expect(submit).not.toHaveBeenCalled()
})
