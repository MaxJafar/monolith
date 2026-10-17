import { type Server, createServer } from 'node:net'
import { describe, expect, it, vi } from 'vitest'

import { type Service, serviceSchema } from '../shared'
import { encodeVarInt, parseMinecraftStatus, probeService } from './monitor'
import { TargetPolicyError } from './network'

const service = (updates: Partial<Service> = {}): Service =>
  serviceSchema.parse({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Fixture',
    created: '2026-10-13T12:00:00Z',
    updated: '2026-10-13T12:00:00Z',
    monitor_revision: 1,
    monitor_kind: 'http',
    monitor_target: 'https://fixture.invalid',
    monitor_enabled: true,
    ...updates
  })
const packet = (data: unknown) => {
  const json = Buffer.from(JSON.stringify(data))
  const payload = Buffer.concat([
    Buffer.from([0]),
    encodeVarInt(json.length),
    json
  ])

  return Buffer.concat([encodeVarInt(payload.length), payload])
}
const status = { players: { online: 3, max: 20 }, version: { name: '1.21.4' } }

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()

  if (!address || typeof address === 'string')
    throw new Error('Fixture did not bind a TCP port')

  return address.port
}

const close = (server: Server) =>
  new Promise<void>(resolve => server.close(() => resolve()))
const trustedFixtureIO = {
  resolve: vi.fn(async () => ({ address: '127.0.0.1', family: 4 })),
  read: vi.fn(async () => ({ status: 200, body: null }))
}

describe('HTTP observations', () => {
  it.each([404, 405, 501])('checks GET after a HEAD %s before declaring an outage', async headStatus => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ status: headStatus, body: null })
      .mockResolvedValueOnce({ status: 200, body: null })
    const result = await probeService(service(), { ...trustedFixtureIO, read })

    expect(result).toMatchObject({ status: 'up', http_status: 200 })
    expect(read.mock.calls).toEqual([
      ['https://fixture.invalid', 'HEAD'],
      ['https://fixture.invalid', 'GET']
    ])
    expect(result.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it.each([200, 204, 302, 401, 403])(
    'records available HTTP %s with explicit authentication semantics',
    async code => {
      const read = vi.fn(async () => ({ status: code, body: null }))
      const result = await probeService(service(), {
        ...trustedFixtureIO,
        read
      })

      expect(result.status).toBe('up')
      expect(result.http_status).toBe(code)
      expect(read).toHaveBeenCalledTimes(1)
      if ([401, 403].includes(code))
        expect(result.message).toContain('Authentication required')
    }
  )

  it.each([404, 429, 500, 503])(
    'records HTTP %s as down without replacing it with a fabricated success',
    async code => {
      const result = await probeService(service(), {
        ...trustedFixtureIO,
        read: vi.fn(async () => ({ status: code, body: null }))
      })

      expect(result).toMatchObject({ status: 'down', http_status: code })
    }
  )

  it('distinguishes unavailable connections from blocked targets', async () => {
    const down = await probeService(service(), {
      ...trustedFixtureIO,
      read: vi.fn(async () => {
        throw Object.assign(new Error('private host detail'), {
          code: 'ECONNREFUSED'
        })
      })
    })
    const blocked = await probeService(service(), {
      ...trustedFixtureIO,
      read: vi.fn(async () => {
        throw new TargetPolicyError('Target is blocked')
      })
    })

    expect(down).toMatchObject({
      status: 'down',
      latency_ms: null,
      http_status: null
    })
    expect(blocked).toMatchObject({
      status: 'error',
      message: 'Target is blocked'
    })
    expect(down.message).not.toContain('private host detail')
  })
})

describe('Minecraft Java status framing', () => {
  it('reads the declared status JSON when a server appends bounded extension data', () => {
    const json = Buffer.from(JSON.stringify({ ...status, description: { text: 'Привет' } }))
    const frame = Buffer.concat([Buffer.from([0]), encodeVarInt(json.length), json, Buffer.alloc(102)])
    const response = Buffer.concat([encodeVarInt(frame.length), frame])

    expect(parseMinecraftStatus(response)).toEqual({ players_online: 3, players_max: 20, version: '1.21.4' })
    expect(parseMinecraftStatus(response.subarray(0, response.length - 1))).toBeNull()
  })
  it('decodes an observed player count/version and waits for incomplete frames', () => {
    const response = packet(status)

    expect(parseMinecraftStatus(response.subarray(0, 1))).toBeNull()
    expect(
      parseMinecraftStatus(response.subarray(0, response.length - 1))
    ).toBeNull()
    expect(parseMinecraftStatus(response)).toEqual({
      players_online: 3,
      players_max: 20,
      version: '1.21.4'
    })
  })

  it('keeps zero players and excludes invalid or fractional metrics', () => {
    expect(
      parseMinecraftStatus(packet({ players: { online: 0, max: 0 } }))
    ).toEqual({ players_online: 0, players_max: 0 })
    expect(
      parseMinecraftStatus(
        packet({
          players: { online: -1, max: 1.5 },
          version: { name: 'valid' }
        })
      )
    ).toEqual({ version: 'valid' })
  })

  it.each([
    Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80]),
    encodeVarInt(65537),
    Buffer.from([2, 1, 0]),
    Buffer.from([4, 0, 2, 123, 125, 1]),
    packet({ arbitrary: true })
  ])('rejects malformed, unsupported or oversized status packets', response => {
    expect(() => parseMinecraftStatus(response)).toThrow()
  })

  it('bounds displayed version text without copying server control characters', () => {
    const details = parseMinecraftStatus(
      packet({ version: { name: `\u0000${'v'.repeat(600)}` } })
    )

    expect(details?.version).toHaveLength(500)
    expect(details?.version).not.toContain('\u0000')
  })
})

describe('Fixture-only actual TCP sockets', () => {
  it('observes a successful TCP connection without a game handshake', async () => {
    const server = createServer(socket => socket.on('error', () => {}))
    const port = await listen(server)

    try {
      const result = await probeService(
        service({
          monitor_kind: 'tcp',
          monitor_target: 'fixture.invalid',
          monitor_port: port
        }),
        trustedFixtureIO
      )

      expect(result).toMatchObject({
        status: 'up',
        message: 'TCP connection established',
        http_status: null
      })
      expect(result).not.toHaveProperty('details')
    } finally {
      await close(server)
    }
  })

  it('observes a Minecraft response split across socket reads', async () => {
    let handshake: Buffer | null = null

    const server = createServer(socket => {
      socket.on('error', () => {})
      socket.once('data', bytes => {
        handshake = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
        const response = packet(status)

        socket.write(response.subarray(0, 2))
        setTimeout(() => socket.end(response.subarray(2)), 10)
      })
    })
    const port = await listen(server)

    try {
      const result = await probeService(
        service({
          monitor_kind: 'minecraft',
          monitor_target: 'fixture.invalid',
          monitor_port: port
        }),
        trustedFixtureIO
      )

      expect(result).toMatchObject({
        status: 'up',
        details: { players_online: 3, players_max: 20, version: '1.21.4' }
      })
      expect(handshake).not.toBeNull()
    } finally {
      await close(server)
    }
  })

  it.each(['malformed', 'oversized'])(
    'reports a %s Minecraft socket response as an error',
    async scenario => {
      const server = createServer(socket => {
        socket.on('error', () => {})
        socket.once('data', () =>
          socket.end(
            scenario === 'malformed'
              ? Buffer.from([2, 1, 0])
              : Buffer.alloc(65543)
          )
        )
      })
      const port = await listen(server)

      try {
        const result = await probeService(
          service({
            monitor_kind: 'minecraft',
            monitor_target: 'fixture.invalid',
            monitor_port: port
          }),
          trustedFixtureIO
        )

        expect(result).toMatchObject({
          status: 'error',
          latency_ms: null,
          http_status: null
        })
        expect(result).not.toHaveProperty('details')
      } finally {
        await close(server)
      }
    }
  )
})
