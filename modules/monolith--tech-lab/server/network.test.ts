import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  TargetPolicyError,
  blockedAddress,
  readTarget,
  resolveTarget,
  targetUrl
} from './network'

type Resolved = { address: string; family: number }
type RequestOptions = {
  method: string
  headers: Record<string, string>
  agent: boolean
  lookup: (
    host: string,
    options: { all?: boolean },
    callback: (
      error: null,
      address: string | Resolved[],
      family?: number
    ) => void
  ) => void
}
type Response = EventEmitter & { statusCode: number; destroy: () => void }
type Request = EventEmitter & {
  end: () => void
  destroy: (error?: Error) => void
}

const io = vi.hoisted(() => ({
  lookup: vi.fn<() => Promise<Resolved[]>>(),
  request:
    vi.fn<
      (
        url: URL,
        options: RequestOptions,
        response: (value: Response) => void
      ) => Request
    >()
}))

vi.mock('node:dns/promises', () => ({ lookup: io.lookup }))
vi.mock('node:http', () => ({ request: io.request }))
vi.mock('node:https', () => ({ request: io.request }))

beforeEach(() => {
  io.lookup.mockReset()
  io.request.mockReset()
})

describe('Target address policy', () => {
  it.each([
    '0.0.0.0',
    '0.5.6.7',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '224.0.0.1',
    '255.255.255.255',
    '100.100.100.200',
    '::',
    '::1',
    '0:0:0:0:0:0:0:1',
    'fe80::1',
    'febf::ffff',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:a9fe:a9fe',
    '::ffff:100.100.100.200',
    '::127.0.0.1',
    '::7f00:1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
    'not-an-ip'
  ])('blocks reserved target %s', address => {
    expect(blockedAddress(address)).toBe(true)
  })

  it.each([
    '192.168.1.12',
    '10.0.0.2',
    '172.16.0.2',
    '100.72.3.4',
    '8.8.8.8',
    'fd7a:115c:a1e0::2',
    '2001:db8::1234',
    '::ffff:192.168.1.12'
  ])('allows intentional LAN/Tailscale or ordinary targets %s', address => {
    expect(blockedAddress(address)).toBe(false)
  })

  it('checks every DNS answer and does not choose a safe answer from a mixed set', async () => {
    io.lookup.mockResolvedValue([
      { address: '192.168.1.12', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ])

    await expect(resolveTarget('fixture.invalid')).rejects.toBeInstanceOf(
      TargetPolicyError
    )
    expect(io.request).not.toHaveBeenCalled()
  })

  it('returns the checked first address without a second DNS resolution', async () => {
    io.lookup.mockResolvedValue([
      { address: '192.168.1.12', family: 4 },
      { address: '10.0.0.12', family: 4 }
    ])

    expect(await resolveTarget('fixture.invalid')).toEqual({
      address: '192.168.1.12',
      family: 4
    })
    expect(io.lookup).toHaveBeenCalledTimes(1)
    expect(io.lookup).toHaveBeenCalledWith('fixture.invalid', {
      all: true,
      verbatim: true
    })
  })

  it('rejects direct mapped loopback without using DNS', async () => {
    await expect(resolveTarget('[::ffff:7f00:1]')).rejects.toBeInstanceOf(
      TargetPolicyError
    )
    expect(io.lookup).not.toHaveBeenCalled()
  })

  it.each([
    '',
    'user@host.local',
    'host.local/path',
    'host.local\\path',
    'x'.repeat(254)
  ])('rejects malformed hostname %s', async hostname => {
    await expect(resolveTarget(hostname)).rejects.toBeInstanceOf(
      TargetPolicyError
    )
    expect(io.lookup).not.toHaveBeenCalled()
  })
})

describe('HTTP target policy and bounded reads', () => {
  it.each([
    'file:///etc/passwd',
    'ftp://host.local',
    'http://user:password@host.local',
    'http://host.local/#fragment',
    'http://host.local/?api_key=secret',
    'http://host.local/?ACCESS_TOKEN=secret',
    'http://host.local/?authorization=secret'
  ])('rejects credential-bearing or unsupported URL %s', url => {
    expect(() => targetUrl(url)).toThrow(TargetPolicyError)
  })

  it('accepts a private launcher origin with ordinary query parameters', () => {
    expect(targetUrl('http://192.168.1.12:8080/health?mode=basic').href).toBe(
      'http://192.168.1.12:8080/health?mode=basic'
    )
  })

  it('pins the checked DNS answer and does not send credentials or cookies', async () => {
    io.lookup.mockResolvedValue([{ address: '192.168.1.12', family: 4 }])
    io.request.mockImplementation((_url, options, respond) => {
      const request = Object.assign(new EventEmitter(), {
        end() {
          const response = Object.assign(new EventEmitter(), {
            statusCode: 200,
            destroy() {
              request.emit('close')
            }
          })

          respond(response)
        },
        destroy() {}
      })
      const one = vi.fn()
      const all = vi.fn()

      options.lookup('fixture.invalid', {}, one)
      options.lookup('fixture.invalid', { all: true }, all)
      expect(one).toHaveBeenCalledWith(null, '192.168.1.12', 4)
      expect(all).toHaveBeenCalledWith(null, [
        { address: '192.168.1.12', family: 4 }
      ])
      expect(options.method).toBe('HEAD')
      expect(options.agent).toBe(false)
      expect(Object.keys(options.headers).sort()).toEqual([
        'Accept',
        'User-Agent'
      ])

      return request
    })

    expect(await readTarget('http://fixture.invalid/health', 'HEAD')).toEqual({
      status: 200,
      body: null
    })
    expect(io.lookup).toHaveBeenCalledTimes(1)
  })

  it('reports a redirect status without following Location', async () => {
    io.lookup.mockResolvedValue([{ address: '192.168.1.12', family: 4 }])
    io.request.mockImplementation((_url, _options, respond) => {
      const request = Object.assign(new EventEmitter(), {
        end() {
          respond(
            Object.assign(new EventEmitter(), {
              statusCode: 302,
              headers: { location: 'http://127.0.0.1/private' },
              destroy() {
                request.emit('close')
              }
            })
          )
        },
        destroy() {}
      })

      return request
    })

    expect(await readTarget('http://fixture.invalid')).toEqual({
      status: 302,
      body: null
    })
    expect(io.request).toHaveBeenCalledTimes(1)
  })

  it.each(['oversized', 'invalid-json'])(
    'rejects %s telemetry responses without returning source content',
    async scenario => {
      io.lookup.mockResolvedValue([{ address: '192.168.1.12', family: 4 }])
      io.request.mockImplementation((_url, _options, respond) => {
        const request = Object.assign(new EventEmitter(), {
          end() {
            const response = Object.assign(new EventEmitter(), {
              statusCode: 200,
              destroy() {
                request.emit('close')
              }
            })

            respond(response)
            response.emit(
              'data',
              scenario === 'oversized'
                ? Buffer.alloc(262145)
                : Buffer.from('PRIVATE_RESPONSE_SECRET')
            )
            response.emit('end')
            request.emit('close')
          },
          destroy() {}
        })

        return request
      })

      await expect(
        readTarget('http://fixture.invalid', 'GET', true)
      ).rejects.toThrow(
        scenario === 'oversized' ? 'size limit' : 'not valid JSON'
      )
    }
  )
})
