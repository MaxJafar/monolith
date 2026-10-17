import { describe, expect, it } from 'vitest'

import { passwordSchema, profileSchema } from './profile'

describe('profile edit validation', () => {
  it('accepts a real leap day without converting its local calendar date', () => {
    expect(
      profileSchema('dateOfBirth', 'invalid').parse({ value: '2000-02-29' })
    ).toEqual({ value: '2000-02-29' })

    for (const value of [
      '2001-02-29',
      '2000-04-31',
      '2000-13-01',
      'not-a-date',
      ''
    ]) {
      expect(
        profileSchema('dateOfBirth', 'invalid').safeParse({ value }).success
      ).toBe(false)
    }
  })
  it('uses the API username and email constraints and trims profile values', () => {
    expect(
      profileSchema('username', 'invalid').safeParse({ value: 'person name' })
        .success
    ).toBe(false)
    expect(
      profileSchema('email', 'invalid').safeParse({ value: 'incomplete@' })
        .success
    ).toBe(false)
    expect(
      profileSchema('name', 'invalid').parse({ value: '  Monolith User  ' })
    ).toEqual({ value: 'Monolith User' })
  })
  it('requires the current password and an exact confirmation without trimming secrets', () => {
    const schema = passwordSchema({
      required: 'required',
      length: 'short',
      mismatch: 'mismatch'
    })
    expect(
      schema.safeParse({
        oldPassword: '',
        password: 'new-password',
        passwordConfirm: 'new-password'
      }).success
    ).toBe(false)
    expect(
      schema.safeParse({
        oldPassword: 'old',
        password: 'new-password',
        passwordConfirm: 'different'
      }).success
    ).toBe(false)
    expect(
      schema.parse({
        oldPassword: ' old ',
        password: ' new-password ',
        passwordConfirm: ' new-password '
      }).password
    ).toBe(' new-password ')
  })
})
