// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { type UseFormReturn, useForm } from 'react-hook-form'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { bindField } from './binding'

vi.mock('../FormModal', () => ({ useNamespace: () => 'workspace' }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

type Draft = { title?: string; amount?: number }
type InputProps = {
  id: string
  value: string | number
  onChange: (value: string | number) => void
  namespace?: string | false
  errorMsg?: string
}

function Input({ id, value, onChange, namespace, errorMsg }: InputProps) {
  return (
    <input
      id={id}
      value={value}
      data-namespace={String(namespace)}
      data-error={errorMsg}
      onInput={event => onChange(event.currentTarget.value)}
      onChange={() => {}}
    />
  )
}

const Title = bindField<string, InputProps>(Input, value => value ?? '')
const Amount = bindField<number, InputProps>(Input, value => value ?? 0)
let form: UseFormReturn<Draft>
let root: Root
let container: HTMLDivElement

function Editor({ empty = false }: { empty?: boolean }) {
  form = useForm<Draft>({
    defaultValues: empty
      ? { title: undefined, amount: undefined }
      : { title: 'First', amount: 42 }
  })
  return (
    <>
      <Title id="title" control={form.control} name="title" />
      <Amount
        id="amount"
        control={form.control}
        name="amount"
        namespace={false}
      />
    </>
  )
}

beforeEach(async () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<Editor />))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

it('updates the form and follows reset without a stale field value', async () => {
  const title = container.querySelector<HTMLInputElement>('#title')!
  await act(async () => {
    title.value = 'Edited'
    title.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(form.getValues('title')).toBe('Edited')
  await act(async () => form.reset({ title: 'Restored', amount: 75 }))
  expect(title.value).toBe('Restored')
  expect(container.querySelector<HTMLInputElement>('#amount')!.value).toBe('75')
})

it('keeps translation opt-out and reports validation errors', async () => {
  expect(
    container.querySelector('#title')!.getAttribute('data-namespace')
  ).toBe('workspace')
  expect(
    container.querySelector('#amount')!.getAttribute('data-namespace')
  ).toBe('false')
  await act(async () =>
    form.setError('title', { message: 'Title is required' })
  )
  expect(container.querySelector('#title')!.getAttribute('data-error')).toBe(
    'Title is required'
  )
})

it('supplies editable empty values without changing stored form data', async () => {
  await act(async () => root.render(<Editor key="empty" empty />))
  expect(container.querySelector<HTMLInputElement>('#title')!.value).toBe('')
  expect(container.querySelector<HTMLInputElement>('#amount')!.value).toBe('0')
  expect(form.getValues()).toEqual({ title: undefined, amount: undefined })
})
