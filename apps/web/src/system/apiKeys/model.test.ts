import { describe, expect, it } from 'vitest'

import { credentialSchema, credentialUsers } from './model'

const values = {
  keyId: 'sample-key',
  name: 'Example',
  icon: 'tabler:key',
  exposable: false,
  overrideKey: false,
  key: ''
}
const messages = { id: 'id', required: 'required' }

describe('credential editing', () => {
  it('keeps a saved secret unless replacement is explicitly requested', () => {
    expect(credentialSchema(false, messages).safeParse(values).success).toBe(
      true
    )
    expect(credentialSchema(true, messages).safeParse(values).success).toBe(
      false
    )
    expect(
      credentialSchema(false, messages).safeParse({
        ...values,
        overrideKey: true,
        key: '  '
      }).success
    ).toBe(false)
    expect(
      credentialSchema(false, messages).parse({
        ...values,
        overrideKey: true,
        key: ' secret '
      }).key
    ).toBe(' secret ')
  })
  it('does not count duplicate addon placement or inherited object properties as a permission', () => {
    const allowed = {
      name: 'example',
      APIKeyAccess: { 'sample-key': { usage: 'Sync', required: true } }
    }
    const inherited = {
      name: 'other',
      APIKeyAccess: Object.create({
        'sample-key': { usage: 'Never', required: true }
      })
    }
    expect(
      credentialUsers(
        [{ items: [allowed, inherited] }, { items: [allowed] }],
        'sample-key'
      )
    ).toEqual([allowed])
  })
})
