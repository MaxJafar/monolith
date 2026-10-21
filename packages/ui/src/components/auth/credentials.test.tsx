// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { type ReactNode, act, createElement, useState } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { OTPInputBox } from './OTPInputBox'
import { WithMasterPassword } from './WithMasterPassword'
import { CreatePasswordScreen } from './WithMasterPassword/components/CreatePasswordScreen'

vi.mock('@monolith/api', () => ({
  encrypt: (value: string) => 'encrypted:' + value
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/components/primitives', () => {
  function Primitive({
    as = 'div',
    children,
    ...props
  }: Record<string, unknown>) {
    const attributes = Object.fromEntries(
      Object.entries(props).filter(([key]) =>
        /^(on[A-Z]|aria-|data-|role$|id$)/.test(key)
      )
    )
    return createElement(as as string, attributes, children as ReactNode)
  }
  return {
    Stack: Primitive,
    Flex: Primitive,
    Text: Primitive,
    Icon: () => null
  }
})
vi.mock('@/components/inputs', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
    disabled,
    loading
  }: Record<string, unknown>) => (
    <button
      type={type as 'button'}
      disabled={Boolean(disabled || loading)}
      onClick={onClick as React.MouseEventHandler}
    >
      {children as ReactNode}
    </button>
  ),
  TextInput: ({
    label,
    onChange,
    onKeyDown,
    value,
    disabled
  }: Record<string, unknown>) => (
    <input
      aria-label={label as string}
      value={value as string}
      disabled={disabled as boolean}
      onKeyDown={onKeyDown as React.KeyboardEventHandler}
      onChange={event =>
        (onChange as (value: string) => void)(event.target.value)
      }
    />
  )
}))
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
async function change(label: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="' + label + '"]'
  )!
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() {
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  )
}
function button(label: string) {
  return [...container.querySelectorAll('button')].find(
    node => node.textContent === label
  )!
}

it('sanitizes pasted codes, requires six digits and suppresses concurrent requests', async () => {
  let finish!: () => void
  const verify = vi.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      })
  )
  function Entry() {
    const [otp, setOtp] = useState('')
    return (
      <OTPInputBox
        otp={otp}
        setOtp={setOtp}
        verifyOTP={verify}
        verifyOtpLoading={false}
      />
    )
  }
  await act(async () => root.render(<Entry />))
  expect(button('otp.buttons.verify').disabled).toBe(true)
  await change('otp.codeLabel', '12 3-4567')
  expect(container.querySelector('input')!.value).toBe('123456')
  await act(async () => {
    button('otp.buttons.verify').click()
    button('otp.buttons.verify').click()
  })
  expect(verify).toHaveBeenCalledExactlyOnceWith('123456')
  expect(container.querySelector('input')!.disabled).toBe(true)
  await act(async () => finish())
  expect(container.querySelector('input')!.disabled).toBe(false)
})
it('keeps the verification code after rejection for retry', async () => {
  const verify = vi
    .fn()
    .mockRejectedValueOnce(Error('offline'))
    .mockResolvedValue(undefined)
  await act(async () =>
    root.render(
      <OTPInputBox
        otp="654321"
        setOtp={() => {}}
        verifyOTP={verify}
        verifyOtpLoading={false}
      />
    )
  )
  await act(async () => button('otp.buttons.verify').click())
  expect(container.querySelector('[role="alert"]')!.textContent).toBe(
    'otp.messages.verify.failed'
  )
  expect(container.querySelector('input')!.value).toBe('654321')
  await act(async () => button('otp.buttons.verify').click())
  expect(verify).toHaveBeenCalledTimes(2)
  expect(container.querySelector('[role="alert"]')).toBeNull()
})
it('requires exact confirmation and explicit review before creating a vault password', async () => {
  const query = vi.fn().mockResolvedValue('challenge')
  const mutate = vi.fn().mockRejectedValue(Error('offline'))
  await act(async () =>
    root.render(
      <CreatePasswordScreen
        controller={{ mutate } as never}
        challengeController={{ query } as never}
      />
    )
  )
  await change('vault.inputs.newPassword', ' secret ')
  await change('vault.inputs.confirmPassword', 'secret')
  await submit()
  expect(container.textContent).toContain('vault.errors.mismatch')
  expect(query).not.toHaveBeenCalled()
  await change('vault.inputs.confirmPassword', ' secret ')
  await submit()
  expect(button('vault.confirmCreate')).toBeDefined()
  expect(query).not.toHaveBeenCalled()
  await submit()
  expect(mutate).toHaveBeenCalledExactlyOnceWith({
    password: 'encrypted: secret '
  })
  expect(container.textContent).toContain('vault.errors.create')
  expect(container.querySelector('input')!.value).toBe(' secret ')
})
it('does not unlock after verification failure and forgets a removed credential', async () => {
  const verify = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
  const props = {
    controllers: {
      getChallenge: { query: async () => 'challenge' },
      verifyPassword: { mutate: verify },
      createPassword: {}
    } as never,
    hasMasterPassword: true,
    children: (password: string) => <div data-unlocked>{password}</div>
  }
  await act(async () => root.render(<WithMasterPassword {...props} />))
  await change('vault.inputs.masterPassword', ' exact password ')
  await submit()
  expect(container.querySelector('[data-unlocked]')).toBeNull()
  expect(container.querySelector('[role="alert"]')).not.toBeNull()
  await submit()
  expect(container.querySelector('[data-unlocked]')!.textContent).toBe(
    ' exact password '
  )
  await act(async () =>
    root.render(<WithMasterPassword {...props} hasMasterPassword={false} />)
  )
  await act(async () => root.render(<WithMasterPassword {...props} />))
  expect(container.querySelector('[data-unlocked]')).toBeNull()
})
it('ignores a challenge that arrives after the unlock screen is dismissed', async () => {
  let finish!: (value: string) => void
  const verify = vi.fn().mockResolvedValue(true)
  const props = {
    controllers: {
      getChallenge: {
        query: () =>
          new Promise(resolve => {
            finish = resolve
          })
      },
      verifyPassword: { mutate: verify },
      createPassword: {}
    } as never,
    hasMasterPassword: true,
    children: () => null
  }
  await act(async () => root.render(<WithMasterPassword {...props} />))
  await change('vault.inputs.masterPassword', 'password')
  await submit()
  await act(async () => root.render(null))
  await act(async () => finish('challenge'))
  expect(verify).not.toHaveBeenCalled()
})
