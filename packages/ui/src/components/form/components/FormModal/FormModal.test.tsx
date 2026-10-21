// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { type UseFormReturn, useForm } from 'react-hook-form'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { FormModal } from '.'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value })
}))
vi.mock('@/components/feedback', () => ({
  LoadingScreen: () => <span>Loading</span>
}))
vi.mock('@/components/overlays', () => ({
  ModalHeader: ({
    title,
    titleId,
    onClose
  }: {
    title: ReactNode
    titleId: string
    onClose: () => void
  }) => (
    <header>
      <h2 id={titleId}>{title}</h2>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </header>
  )
}))
vi.mock('@/components/inputs', () => ({
  Button: ({
    children,
    type,
    onClick,
    disabled,
    loading
  }: {
    children: ReactNode
    type: 'submit' | 'button'
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
  }) => (
    <button type={type} onClick={onClick} disabled={disabled || loading}>
      {children}
    </button>
  )
}))
vi.mock('@/components/primitives', () => {
  function Primitive({
    as = 'div',
    children,
    ...props
  }: Record<string, unknown>) {
    return createElement(
      as as string,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|role$|className$|disabled$|tabIndex$)/.test(key)
        )
      ),
      children as ReactNode
    )
  }
  return { Stack: Primitive, Flex: Primitive, Text: Primitive }
})
let root: Root, host: HTMLDivElement, form: UseFormReturn<{ title: string }>
const save = vi.fn(),
  close = vi.fn()
function Read() {
  form = useForm({ defaultValues: { title: 'Draft title' } })
  return (
    <FormModal
      form={form}
      uiConfig={{ title: 'Edit draft', icon: 'tabler:notes', onClose: close }}
      submissionConfig={{ template: 'update', handler: save }}
    >
      <input
        aria-label="Title"
        {...form.register('title', { required: 'A title is required' })}
      />
      <output>{form.formState.errors.title?.message}</output>
    </FormModal>
  )
}
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  save.mockReset().mockResolvedValue(undefined)
  close.mockReset()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<Read />))
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})
async function submit() {
  await act(async () => {
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}
it('keeps failed values editable and closes only after a successful retry', async () => {
  save.mockRejectedValueOnce(Error('Connection unavailable'))
  await act(async () =>
    form.setValue('title', 'Keep this draft', { shouldDirty: true })
  )
  await submit()
  expect(close).not.toHaveBeenCalled()
  expect(host.querySelector('[role=alert]')!.textContent).toBe(
    'Connection unavailable'
  )
  expect(host.querySelector('input')!.value).toBe('Keep this draft')
  expect(host.querySelector('fieldset')!.disabled).toBe(false)
  await submit()
  expect(save).toHaveBeenLastCalledWith({ title: 'Keep this draft' })
  expect(close).toHaveBeenCalledOnce()
})
it('locks duplicate submissions and close actions while a save is running', async () => {
  let finish!: () => void
  save.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      })
  )
  await submit()
  await submit()
  await act(async () =>
    host
      .querySelector('header button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  )
  expect(save).toHaveBeenCalledOnce()
  expect(close).not.toHaveBeenCalled()
  expect(host.querySelector('[role=dialog]')!.getAttribute('aria-busy')).toBe(
    'true'
  )
  await act(async () => finish())
  expect(close).toHaveBeenCalledOnce()
})
it('does not invoke a save when field validation fails', async () => {
  await act(async () => form.setValue('title', ''))
  await submit()
  expect(save).not.toHaveBeenCalled()
  expect(host.querySelector('output')!.textContent).toBe('A title is required')
  expect(host.querySelector('fieldset')!.disabled).toBe(false)
})
it('ignores completion after the dialog unmounts', async () => {
  let finish!: () => void
  save.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      })
  )
  await submit()
  await act(async () => root.render(null))
  await act(async () => finish())
  expect(close).not.toHaveBeenCalled()
})
