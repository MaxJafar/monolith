// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import {
  type ElementType,
  type ReactElement,
  type ReactNode,
  act,
  cloneElement,
  createElement,
  useState
} from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ComboboxInput } from './ComboboxInput'
import { ComboboxOption } from './ComboboxInput/components/ComboboxOption'
import { CurrencyInput } from './CurrencyInput'
import { ListboxInput } from './ListboxInput'
import { ListboxOption } from './ListboxInput/components/ListboxOption'
import { NumberInput } from './NumberInput'
import { TextAreaInput } from './TextAreaInput'
import { TextInput } from './TextInput'

vi.mock('@monolith/api', async () =>
  vi.importActual('../../../../api/src/hooks/usePromiseLoading')
)
vi.mock('../primitives', () => {
  function Primitive({
    as = 'div',
    asChild,
    children,
    ...props
  }: {
    as?: ElementType
    asChild?: boolean
    children?: ReactNode
    [key: string]: unknown
  }) {
    const attributes = Object.fromEntries(
      Object.entries(props).filter(([key]) =>
        /^(aria-|data-|on[A-Z]|ref$|role$|id$|tabIndex$|htmlFor$|className$|style$)/.test(
          key
        )
      )
    )
    return asChild
      ? cloneElement(children as ReactElement, attributes)
      : createElement(as, attributes, children)
  }
  return {
    Flex: Primitive,
    Box: Primitive,
    Text: Primitive,
    Slot: ({ children }: { children: ReactNode }) => children,
    Icon: () => null
  }
})
vi.mock('./Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    onBlur,
    ...props
  }: Record<string, unknown>) => (
    <button
      {...Object.fromEntries(
        Object.entries(props).filter(([key]) => key.startsWith('aria-'))
      )}
      type="button"
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
      disabled={Boolean(disabled || loading)}
    >
      {children as ReactNode}
    </button>
  )
}))
vi.mock('@/system', () => ({ surface: { lightInteractive: {} } }))
vi.mock('./shared/hooks/useInputLabel', () => ({
  useInputLabel: ({ label }: { label: string }) => label
}))
vi.mock('./shared/components/InputWrapper/InputWrapper.css', () => ({
  inputWrapperRecipe: () => '',
  inputWrapperErrorTextStyle: ''
}))
vi.mock('./shared/components/InputLabel/InputLabel.css', () => ({
  inputLabelActiveStyle: '',
  inputLabelInactiveStyle: ''
}))
vi.mock('./shared/components/Placeholder/Placeholder.css', () => ({
  placeholderRecipe: () => ''
}))
vi.mock('./TextInput/components/TextInputBox.css', () => ({
  textInputBoxRecipe: () => ''
}))
vi.mock('./TextAreaInput/textarea.css', () => ({ textarea: () => '' }))
vi.mock('./shared/components/choice.css', () => ({
  option: '',
  menu: '',
  choiceButton: ''
}))
vi.mock('@/providers/AppearanceProvider', () => ({
  useAppearance: () => ({ appearance: {} }),
  appearanceVariables: () => ({})
}))
vi.mock('@/providers/PersonalizationProvider', () => ({
  usePersonalization: () => ({ derivedTheme: 'dark' })
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root, host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})
async function enterValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(
      element,
      value
    )
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

it('associates the visible label and validation message with the text field', async () => {
  await act(async () =>
    root.render(
      <TextInput
        value=""
        onChange={() => {}}
        label="Project name"
        placeholder="Name"
        errorMsg="Name required"
        required
      />
    )
  )
  const input = host.querySelector('input')!
  expect(host.querySelector('label')!.htmlFor).toBe(input.id)
  expect(input.required).toBe(true)
  expect(
    document.getElementById(input.getAttribute('aria-describedby')!)!
      .textContent
  ).toBe('Name required')
  expect(input.getAttribute('aria-invalid')).toBe('true')
})

it('supports the password toggle without submitting its containing form', async () => {
  const submit = vi.fn()
  await act(async () =>
    root.render(
      <form onSubmit={submit}>
        <TextInput
          isPassword
          value="secret"
          onChange={() => {}}
          placeholder="Password"
        />
      </form>
    )
  )
  const input = host.querySelector('input')!,
    toggle = host.querySelector('button')!
  await act(async () => toggle.click())
  expect(input.type).toBe('text')
  expect(toggle.getAttribute('aria-pressed')).toBe('true')
  await act(async () => toggle.click())
  expect(input.type).toBe('password')
  expect(submit).not.toHaveBeenCalled()
})

it('passes the click event to an asynchronous field action and disables it until completion', async () => {
  let finish!: () => void
  const action = vi.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      })
  )
  await act(async () =>
    root.render(
      <TextInput
        value=""
        onChange={() => {}}
        placeholder="Code"
        actionButtonProps={{ onClick: action, 'aria-label': 'Scan' }}
      />
    )
  )
  const button = host.querySelector('button')!
  await act(async () => button.click())
  expect(action.mock.calls[0]).toHaveLength(1)
  expect(button.disabled).toBe(true)
  await act(async () => finish())
  expect(button.disabled).toBe(false)
})

it('does not submit while an input method is composing', async () => {
  const submit = vi.fn()
  await act(async () =>
    root.render(
      <TextInput
        value=""
        onChange={() => {}}
        placeholder="Title"
        onEnter={submit}
      />
    )
  )
  const input = host.querySelector('input')!
  await act(async () =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        isComposing: true
      })
    )
  )
  expect(submit).not.toHaveBeenCalled()
  await act(async () =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
  )
  expect(submit).toHaveBeenCalledOnce()
})

it('leaves multiline editing native and reports the full replacement value', async () => {
  const change = vi.fn()
  await act(async () =>
    root.render(
      <TextAreaInput value="one" onChange={change} placeholder="Description" />
    )
  )
  const input = host.querySelector('textarea')!
  const enter = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  })
  await act(async () => input.dispatchEvent(enter))
  expect(enter.defaultPrevented).toBe(false)
  await enterValue(input, 'one\ntwo')
  expect(change).toHaveBeenLastCalledWith('one\ntwo')
})

it('formats currency edits, clears to zero, and follows external values without emitting changes', async () => {
  const change = vi.fn()
  function Currency() {
    const [value, setValue] = useState(1234.5)
    return (
      <CurrencyInput
        value={value}
        onChange={next => {
          change(next)
          setValue(next)
        }}
        prefix="$"
        label="Amount"
      />
    )
  }
  await act(async () => root.render(<Currency />))
  const input = host.querySelector('input')!
  expect(input.value).toBe('$1,234.5')
  expect(change).not.toHaveBeenCalled()
  await enterValue(input, '$29.95')
  expect(change).toHaveBeenLastCalledWith(29.95)
  await enterValue(input, '')
  expect(change).toHaveBeenLastCalledWith(0)
  change.mockClear()
  await act(async () =>
    root.render(<CurrencyInput value={99} prefix="$" onChange={change} />)
  )
  expect(host.querySelector('input')!.value).toBe('$99')
  expect(change).not.toHaveBeenCalled()
})

it('allows a numeric draft below the limit and clamps only when it loses focus', async () => {
  const change = vi.fn()
  function Amount() {
    const [value, setValue] = useState(30)
    return (
      <NumberInput
        label="Minutes"
        icon="tabler:clock"
        min={10}
        max={100}
        value={value}
        onChange={next => {
          setValue(next)
          change(next)
        }}
      />
    )
  }
  await act(async () => root.render(<Amount />))
  const input = host.querySelector('input')!
  await enterValue(input, '-8')
  expect(change).toHaveBeenLastCalledWith(-8)
  await act(async () =>
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  )
  expect(change).toHaveBeenLastCalledWith(10)
  expect(input.value).toBe('10')
})

it('disables the actual listbox trigger and selection', async () => {
  const change = vi.fn()
  await act(async () =>
    root.render(
      <ListboxInput disabled label="Status" value="open" onChange={change}>
        <ListboxOption value="done" label="Done" />
      </ListboxInput>
    )
  )
  const button = host.querySelector('button')!
  expect(button.disabled).toBe(true)
  await act(async () => button.click())
  expect(document.querySelector('[role="listbox"]')).toBeNull()
  expect(change).not.toHaveBeenCalled()
})

it('selects a dropdown option and returns keyboard focus to its trigger', async () => {
  const change = vi.fn()
  await act(async () =>
    root.render(
      <ListboxInput label="Status" value="open" onChange={change}>
        <ListboxOption value="open" label="Open" />
        <ListboxOption value="done" label="Done" />
      </ListboxInput>
    )
  )
  const button = host.querySelector('button')!
  await act(async () => button.click())
  const option = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find(item => item.textContent === 'Done')!
  expect(option).toBeTruthy()
  await act(async () => option.click())
  expect(change).toHaveBeenLastCalledWith('done')
  await act(
    async () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  expect(document.activeElement).toBe(button)
})

it('keeps the menu open while selecting multiple values', async () => {
  function Selection() {
    const [value, setValue] = useState<string[]>([])
    return (
      <ListboxInput multiple label="Tags" value={value} onChange={setValue}>
        <ListboxOption value="a" label="First" />
        <ListboxOption value="b" label="Second" />
      </ListboxInput>
    )
  }
  await act(async () => root.render(<Selection />))
  await act(async () => host.querySelector('button')!.click())
  const options = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
  await act(async () => options()[0].click())
  await act(async () => options()[1].click())
  expect(options().map(option => option.getAttribute('aria-selected'))).toEqual(
    ['true', 'true']
  )
})

it('reports combobox search and selected records without losing the record identity', async () => {
  const record = { id: 'alpha', title: 'Alpha' },
    change = vi.fn(),
    query = vi.fn()
  await act(async () =>
    root.render(
      <ComboboxInput<{ id: string; title: string } | undefined>
        label="Project"
        value={undefined}
        onChange={change}
        onQueryChanged={query}
        displayValue={value => value?.title ?? ''}
      >
        <ComboboxOption value={record} label="Alpha" />
      </ComboboxInput>
    )
  )
  const input = host.querySelector('input')!
  await enterValue(input, 'Al')
  expect(query).toHaveBeenLastCalledWith('Al')
  const option = document.querySelector<HTMLElement>('[role="option"]')!
  expect(option).toBeTruthy()
  await act(async () => {
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    option.click()
  })
  expect(change).toHaveBeenLastCalledWith(record)
})

it('autofocuses once without taking focus back after a parent render', async () => {
  function Fields({ value }: { value: string }) {
    return (
      <>
        <TextInput
          autoFocus
          label="Code"
          value={value}
          onChange={() => {}}
          placeholder="Code"
        />
        <button>Elsewhere</button>
      </>
    )
  }
  await act(async () => root.render(<Fields value="" />))
  expect(document.activeElement).toBe(host.querySelector('input'))
  const other = host.querySelector('button')!
  other.focus()
  await act(async () => root.render(<Fields value="123456" />))
  expect(document.activeElement).toBe(other)
})
