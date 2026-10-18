import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { test } from 'node:test'

import { releaseProblems } from './release-preflight.mjs'

function fixture() {
  const pair = generateKeyPairSync('ed25519')
  const publicKey = pair.publicKey
    .export({ format: 'pem', type: 'spki' })
    .toString()
  return {
    publicKey,
    env: {
      MONOLITH_RELEASE_PUBLIC_KEY: publicKey,
      MONOLITH_RELEASE_PRIVATE_KEY: pair.privateKey
        .export({ format: 'pem', type: 'pkcs8' })
        .toString(),
      MONOLITH_ADDON_CATALOG_PRIVATE_KEY: 'configured',
      WINDOWS_SIGNING_PROVIDER: 'pfx',
      WINDOWS_CERTIFICATE_P12: 'configured',
      WINDOWS_CERTIFICATE_PASSWORD: 'private-value',
      MACOS_CERTIFICATE_P12: 'configured',
      MACOS_CERTIFICATE_PASSWORD: 'private-value',
      MACOS_SIGN_IDENTITY: 'Developer ID Application: Example (ABCDE12345)',
      MACOS_TEAM_ID: 'ABCDE12345',
      APPLE_ID: 'example@example.invalid',
      APPLE_APP_PASSWORD: 'private-value'
    }
  }
}

test('unsigned installers still require matching release keys but no OS certificate', () => {
  const f = fixture()
  const env = Object.fromEntries(
    Object.entries(f.env).filter(([name]) => name.startsWith('MONOLITH_'))
  )
  env.MONOLITH_UNSIGNED_INSTALLERS = '1'
  assert.deepEqual(releaseProblems(env, f.publicKey), [])
  assert.match(
    releaseProblems(env, fixture().publicKey).join('\n'),
    /pinned Ed25519/
  )
  delete env.MONOLITH_RELEASE_PRIVATE_KEY
  assert.deepEqual(releaseProblems(env, f.publicKey), [
    'Missing MONOLITH_RELEASE_PRIVATE_KEY'
  ])
})

test('release preflight accepts matching keys and names missing credentials without leaking values', () => {
  const f = fixture()
  assert.deepEqual(releaseProblems(f.env, f.publicKey), [])
  delete f.env.WINDOWS_CERTIFICATE_P12
  assert.deepEqual(releaseProblems(f.env, f.publicKey), [
    'Missing WINDOWS_CERTIFICATE_P12'
  ])
  assert.ok(
    !JSON.stringify(releaseProblems(f.env, f.publicKey)).includes(
      'private-value'
    )
  )
})

test('release preflight rejects accidental key rotation and development signing identities', () => {
  const f = fixture()
  assert.match(
    releaseProblems(f.env, fixture().publicKey).join('\n'),
    /pinned Ed25519/
  )
  f.env.MACOS_SIGN_IDENTITY = '-'
  assert.match(
    releaseProblems(f.env, f.publicKey).join('\n'),
    /Developer ID Application/
  )
  f.env.MONOLITH_RELEASE_PRIVATE_KEY = 'invalid private material'
  const message = releaseProblems(f.env, f.publicKey).join('\n')
  assert.match(message, /pinned Ed25519/)
  assert.ok(!message.includes('invalid private material'))
})

test('cloud signing accepts eSigner credentials without an exported private key', () => {
  const f = fixture()
  delete f.env.WINDOWS_SIGNING_PROVIDER
  delete f.env.WINDOWS_CERTIFICATE_P12
  delete f.env.WINDOWS_CERTIFICATE_PASSWORD
  Object.assign(f.env, {
    ESIGNER_USERNAME: 'signer@example.invalid',
    ESIGNER_PASSWORD: 'secret-password',
    ESIGNER_CREDENTIAL_ID: 'credential-id',
    ESIGNER_TOTP_SECRET: 'secret-totp'
  })
  assert.deepEqual(releaseProblems(f.env, f.publicKey), [])
  delete f.env.ESIGNER_TOTP_SECRET
  assert.deepEqual(releaseProblems(f.env, f.publicKey), [
    'Missing ESIGNER_TOTP_SECRET'
  ])
  f.env.WINDOWS_SIGNING_PROVIDER = 'unknown'
  assert.match(
    releaseProblems(f.env, f.publicKey).join('\n'),
    /must be esigner or pfx/
  )
  assert.ok(
    !releaseProblems(f.env, f.publicKey).join('\n').includes('secret-password')
  )
})
