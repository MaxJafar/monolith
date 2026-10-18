import { createConnection } from 'node:net'

import type { ProbeResult, Service } from '../shared'
import { TargetPolicyError, readTarget, resolveTarget } from './network'

export function encodeVarInt(value: number): Buffer {
  const bytes: number[] = []

  let remaining = value >>> 0

  do {
    let byte = remaining & 127
    remaining >>>= 7
    if (remaining) byte |= 128
    bytes.push(byte)
  } while (remaining)

  return Buffer.from(bytes)
}

function varInt(buffer: Buffer, offset: number) {
  let value = 0

  for (let index = 0; index < 5; index++) {
    const byte = buffer[offset + index]

    if (byte === undefined) return null
    value += (byte & 127) * 2 ** (7 * index)
    if (!(byte & 128)) return { value, next: offset + index + 1 }
  }
  throw new Error('Invalid Minecraft packet length')
}

/** Java Server List Ping only: no login, commands, player identities or server controls. */
export function parseMinecraftStatus(
  buffer: Buffer
): ProbeResult['details'] | null {
  const length = varInt(buffer, 0)

  if (!length) return null
  if (length.value > 65536)
    throw new Error('Minecraft response exceeds the size limit')
  if (buffer.length < length.next + length.value) return null

  const packet = buffer.subarray(length.next, length.next + length.value)
  const id = varInt(packet, 0)
  const size = id && varInt(packet, id.next)

  if (
    !id ||
    id.value !== 0 ||
    !size ||
    size.next + size.value > packet.length
  )
    throw new Error('Invalid Minecraft status response')

  // Read the declared JSON field; server extensions may follow inside the bounded frame.
  const data: unknown = JSON.parse(packet.subarray(size.next, size.next + size.value).toString('utf8'))

  if (!data || typeof data !== 'object')
    throw new Error('Invalid Minecraft status response')

  const details: NonNullable<ProbeResult['details']> = {}
  const players = 'players' in data ? data.players : undefined
  const version = 'version' in data ? data.version : undefined

  if (players && typeof players === 'object') {
    if (
      'online' in players &&
      Number.isSafeInteger(players.online) &&
      Number(players.online) >= 0
    )
      details.players_online = Number(players.online)
    if (
      'max' in players &&
      Number.isSafeInteger(players.max) &&
      Number(players.max) >= 0
    )
      details.players_max = Number(players.max)
  }
  if (
    version &&
    typeof version === 'object' &&
    'name' in version &&
    typeof version.name === 'string'
  )
    details.version = [...version.name]
      .filter(character => character.charCodeAt(0) >= 32)
      .join('')
      .slice(0, 500)
  if (!Object.keys(details).length)
    throw new Error('Invalid Minecraft status response')

  return details
}

type ProbeIO = {
  read: typeof readTarget
  resolve: typeof resolveTarget
}

const defaultIO: ProbeIO = { read: readTarget, resolve: resolveTarget }

async function socketProbe(
  service: Service,
  io: ProbeIO
): Promise<ProbeResult['details']> {
  const resolved = await io.resolve(service.monitor_target)
  const port = service.monitor_port

  if (!port || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new TargetPolicyError('A port between 1 and 65535 is required')

  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: resolved.address,
      family: resolved.family,
      port
    })

    let received = Buffer.alloc(0)

    const deadline = setTimeout(
      () => socket.destroy(new Error('Request timed out')),
      5000
    )

    socket.on('close', () => clearTimeout(deadline))
    socket.on('error', reject)
    socket.on('connect', () => {
      if (service.monitor_kind !== 'minecraft') {
        socket.destroy()
        resolve(undefined)

        return
      }

      const host = Buffer.from(service.monitor_target, 'utf8')
      const portBytes = Buffer.alloc(2)
      portBytes.writeUInt16BE(port)
      const handshake = Buffer.concat([
        Buffer.from([0]),
        encodeVarInt(47),
        encodeVarInt(host.length),
        host,
        portBytes,
        Buffer.from([1])
      ])
      socket.write(
        Buffer.concat([
          encodeVarInt(handshake.length),
          handshake,
          Buffer.from([1, 0])
        ])
      )
    })
    socket.on('data', (chunk: Buffer) => {
      if (received.length + chunk.length > 65542) {
        socket.destroy(new Error('Minecraft response exceeds the size limit'))

        return
      }
      received = Buffer.concat([received, chunk])

      try {
        const details = parseMinecraftStatus(received)

        if (details) {
          socket.destroy()
          resolve(details)
        }
      } catch {
        socket.destroy(new Error('Invalid Minecraft status response'))
      }
    })
    socket.on('end', () =>
      reject(new Error('Connection ended before a status response'))
    )
  })
}

export async function probeService(
  service: Service,
  io: ProbeIO = defaultIO
): Promise<ProbeResult> {
  const started = performance.now()
  const latency = () => Math.round((performance.now() - started) * 10) / 10

  try {
    if (service.monitor_kind === 'none')
      throw new TargetPolicyError('Monitoring is disabled')

    if (service.monitor_kind === 'http') {
      let result = await io.read(service.monitor_target, 'HEAD')

      // Some routers return 404 for an unregistered HEAD handler even when GET exists.
      if ([404, 405, 501].includes(result.status))
        result = await io.read(service.monitor_target, 'GET')

      const up =
        (result.status >= 200 && result.status < 400) ||
        [401, 403].includes(result.status)

      return {
        status: up ? 'up' : 'down',
        latency_ms: latency(),
        http_status: result.status || null,
        message: `HTTP ${result.status}${[401, 403].includes(result.status) ? ' · Authentication required' : ''}`
      }
    }

    const details = await socketProbe(service, io)

    return {
      status: 'up',
      latency_ms: latency(),
      http_status: null,
      message:
        service.monitor_kind === 'minecraft'
          ? 'Minecraft Java status received'
          : 'TCP connection established',
      ...(details ? { details } : {})
    }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : ''
    const down =
      ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'].includes(
        code
      ) ||
      (error instanceof Error && error.message === 'Request timed out')

    return {
      status: down ? 'down' : 'error',
      latency_ms: null,
      http_status: null,
      message:
        error instanceof TargetPolicyError
          ? error.message
          : code
            ? `Connection unavailable (${code.slice(0, 80)})`
            : 'No valid status response was received'
    }
  }
}
