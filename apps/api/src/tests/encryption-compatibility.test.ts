import CryptoJS from 'crypto-js'
import {
  constants,
  createCipheriv,
  createHash,
  publicEncrypt,
  randomBytes
} from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  clearServerPublicKey,
  decryptResponse,
  encryptRequest,
  setServerPublicKey
} from '../../../../packages/api/src/crypto/encryption'
import {
  decrypt,
  decrypt2,
  encrypt,
  encrypt2
} from '../core/functions/auth/encryption'
import {
  decryptAESKey,
  decryptPayload,
  encryptResponse,
  getPublicKey
} from '../core/functions/encryption'

describe('Monolith encryption compatibility', () => {
  it('round-trips Web Crypto requests through the server and rejects modified tags', async () => {
    clearServerPublicKey()
    await setServerPublicKey(getPublicKey())
    const value = { title: 'Unicode ✓', content: 'x'.repeat(90000) }
    const { payload, session } = await encryptRequest(value)
    expect(decryptPayload(payload)).toEqual(value)
    const key = decryptAESKey(payload.k)
    expect(await decryptResponse(encryptResponse(value, key), session)).toEqual(
      value
    )
    expect(() =>
      decryptPayload({ ...payload, tag: Buffer.alloc(16).toString('base64') })
    ).toThrow('Failed to decrypt')
    const short = publicEncrypt(
      {
        key: getPublicKey(),
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      randomBytes(16)
    ).toString('base64')
    expect(() => decryptAESKey(short)).toThrow('AES-256')
  })

  it('authenticates new stored secrets while still reading installed formats', () => {
    const secret = 'test-only-master-secret'
    const data = Buffer.from('stored data')
    const encoded = encrypt(data, secret)
    expect(decrypt(encoded, secret)).toEqual(data)
    const altered = Buffer.from(encoded)
    altered[altered.length - 1] = altered[altered.length - 1]! ^ 1
    expect(() => decrypt(altered, secret)).toThrow()
    expect(decrypt2(encrypt2('api-key', secret), secret)).toBe('api-key')
    expect(
      decrypt2(
        CryptoJS.AES.encrypt('existing-api-key', secret).toString(),
        secret
      )
    ).toBe('existing-api-key')
    const nonce = randomBytes(16)
    const oldCipher = createCipheriv(
      'aes-256-ctr',
      createHash('sha256').update(secret).digest('base64').slice(0, 32),
      nonce
    )
    const installed = Buffer.concat([
      nonce,
      oldCipher.update(data),
      oldCipher.final()
    ])
    expect(decrypt(installed, secret)).toEqual(data)
  })
})
