// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import { initialAccount, validateAccount } from './initialAccount'

it('normalizes identity fields but preserves password bytes', () => {
  const result = validateAccount({
    name: '  Monolith User ',
    username: ' person_1 ',
    email: ' person@example.com ',
    password: ' password ',
    confirmPassword: ' password '
  })
  expect(result.errors).toEqual({})
  expect(result.account).toEqual({
    name: 'Monolith User',
    username: 'person_1',
    email: 'person@example.com',
    password: ' password '
  })
})
it('blocks missing fields, mismatched confirmation, and invalid usernames', () => {
  expect(validateAccount(initialAccount).account).toBeNull()
  const result = validateAccount({
    name: 'Person',
    username: 'not valid',
    email: 'broken',
    password: '123',
    confirmPassword: '456'
  })
  expect(result.errors).toMatchObject({
    username: 'usernameInvalid',
    email: 'emailInvalid',
    password: 'passwordTooShort',
    confirmPassword: 'passwordMismatch'
  })
  expect(result.account).toBeNull()
})
