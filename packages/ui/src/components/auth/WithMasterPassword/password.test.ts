// SPDX-License-Identifier: 0BSD
import { expect, it, vi } from 'vitest'

import {
  generateVaultPassword,
  passwordIssue,
  protectPassword
} from './password'

vi.mock('@monolith/api', () => ({
  encrypt: (value: string, key: string) => key + ':' + value
}))
it('compares the exact password text used by encryption', () => {
  expect(passwordIssue(' secret ', 'secret')).toBe('mismatch')
  expect(passwordIssue(' secret ', ' secret ')).toBeNull()
  expect(passwordIssue('   ', '   ')).toBe('empty')
})
it('uses cryptographic bytes and a uniform 64-character alphabet', () => {
  const random = vi
    .spyOn(crypto, 'getRandomValues')
    .mockImplementation(bytes => {
      ;(bytes as Uint8Array).fill(255)
      return bytes
    })
  expect(generateVaultPassword()).toBe('_'.repeat(20))
  expect(random).toHaveBeenCalledOnce()
  random.mockRestore()
})
it('encrypts the original password using a fresh challenge and rejects invalid challenges', async () => {
  const query = vi
    .fn()
    .mockResolvedValueOnce('one')
    .mockResolvedValueOnce('two')
    .mockResolvedValueOnce(null)
  const controller = { query } as never
  await expect(protectPassword(' secret ', controller)).resolves.toEqual({
    password: 'one: secret '
  })
  await expect(protectPassword('secret', controller)).resolves.toEqual({
    password: 'two:secret'
  })
  await expect(protectPassword('secret', controller)).rejects.toThrow(
    'challenge'
  )
})
