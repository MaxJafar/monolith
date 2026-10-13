import { describe, expect, it } from 'vitest'

import { resolveSocketUrl } from './socketUrl'

describe('socket URL resolution', () => {
  it('connects the default namespace when the API is reverse proxied under /api', () => {
    expect(resolveSocketUrl('/api', 'https://workspace.example')).toBe(
      'https://workspace.example/'
    )
    expect(resolveSocketUrl('/api/', 'http://localhost:8080')).toBe(
      'http://localhost:8080/'
    )
  })

  it('preserves the QR namespace independently of the HTTP API prefix', () => {
    expect(
      resolveSocketUrl('/api/v1', 'https://workspace.example', '/qr-login')
    ).toBe('https://workspace.example/qr-login')
  })

  it('keeps the configured remote API origin and port', () => {
    expect(
      resolveSocketUrl(
        'http://localhost:3636/api',
        'http://localhost:5173',
        '/qr-login'
      )
    ).toBe('http://localhost:3636/qr-login')
    expect(
      resolveSocketUrl('https://api.example/v1/', 'https://workspace.example')
    ).toBe('https://api.example/')
  })

  it('supports the browser origin fallback and protocol-relative hosts', () => {
    expect(resolveSocketUrl('', 'https://workspace.example:8443')).toBe(
      'https://workspace.example:8443/'
    )
    expect(
      resolveSocketUrl('//api.example/api', 'https://workspace.example')
    ).toBe('https://api.example/')
  })
})
