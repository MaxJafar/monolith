// SPDX-License-Identifier: 0BSD
import { EventEmitter } from 'node:events'
import type { Server, Socket } from 'socket.io'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { setupSocket } from '../core/functions/socketio/setupSocket'

const services = vi.hoisted(() => ({
  verify: vi.fn(),
  revocations: vi.fn(),
  rooms: vi.fn(),
  tasks: { job: { status: 'running' } }
}))
vi.mock('../core/functions/deviceSession', () => ({
  verifyApplicationToken: services.verify
}))
vi.mock('../core/drizzle', () => ({
  listenDeviceRevocations: services.revocations
}))
vi.mock('../lib/rooms/realtime', () => ({ setupRoomsRealtime: services.rooms }))
vi.mock('../core/functions/socketio/taskPool', () => ({
  globalTaskPool: services.tasks
}))
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(100000)
  vi.resetAllMocks()
  services.revocations.mockResolvedValue({})
  services.verify.mockResolvedValue({
    sub: 'account',
    dsid: 'device',
    exp: 160
  })
})
afterEach(() => vi.useRealTimers())

function fixture() {
  const main = new EventEmitter(),
    qr = new EventEmitter()
  const socket = new EventEmitter() as EventEmitter & {
    handshake: { auth: Record<string, unknown> }
    data: Record<string, unknown>
    join: ReturnType<typeof vi.fn>
    leave: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    use: ReturnType<typeof vi.fn>
  }
  Object.assign(socket, {
    handshake: { auth: { token: 'credential' } },
    data: {},
    join: vi.fn(async () => {}),
    leave: vi.fn(),
    use: vi.fn(),
    disconnect: vi.fn(() => {
      socket.emit('disconnect')
      return socket
    })
  })
  const roomDisconnect = vi.fn(),
    allDisconnect = vi.fn()
  const io = Object.assign(main, {
    of: vi.fn(() => qr),
    use: vi.fn(),
    in: vi.fn(() => ({ disconnectSockets: roomDisconnect })),
    disconnectSockets: allDisconnect
  })
  setupSocket(io as unknown as Server)
  const next = vi.fn()
  return {
    io,
    socket,
    qr,
    next,
    roomDisconnect,
    allDisconnect,
    connect: () => io.use.mock.calls[0]![0](socket as unknown as Socket, next)
  }
}
it('authenticates connections, binds device revocation rooms and replays active tasks', async () => {
  const state = fixture()
  await state.connect()
  expect(state.next).toHaveBeenCalledWith()
  expect(state.socket.join).toHaveBeenCalledWith('device:device')
  expect(state.socket.data).toEqual({
    userId: 'account',
    deviceSessionId: 'device',
    expiresAt: 160000
  })
  const task = vi.fn()
  state.socket.on('taskPoolUpdate', task)
  state.io.emit('connection', state.socket)
  expect(task).toHaveBeenCalledWith({ taskId: 'job', status: 'running' })
  services.revocations.mock.calls[0]![0]('device')
  expect(state.roomDisconnect).toHaveBeenCalledWith(true)
  state.socket.emit('disconnect')
  expect(vi.getTimerCount()).toBe(0)
})
it('rejects missing credentials and closes an idle socket when its session expires', async () => {
  const missing = fixture()
  missing.socket.handshake.auth = {}
  await missing.connect()
  expect(missing.next).toHaveBeenCalledWith(expect.any(Error))
  const active = fixture()
  await active.connect()
  active.io.emit('connection', active.socket)
  await vi.advanceTimersByTimeAsync(60000)
  expect(active.socket.disconnect).toHaveBeenCalledWith(true)
  expect(vi.getTimerCount()).toBe(0)
})
it('rechecks credentials before packets and tears down a revoked connection', async () => {
  const state = fixture()
  await state.connect()
  state.io.emit('connection', state.socket)
  services.verify.mockRejectedValue(new Error('revoked'))
  const packet = vi.fn()
  await state.socket.use.mock.calls[0]![0](['event'], packet)
  expect(packet).toHaveBeenCalledWith(expect.any(Error))
  expect(state.socket.disconnect).toHaveBeenCalledOnce()
})
it('validates QR room identifiers without sharing authenticated namespace access', () => {
  const state = fixture()
  state.qr.emit('connection', state.socket)
  const joined = vi.fn(),
    error = vi.fn()
  state.socket.on('joinedQRSession', joined)
  state.socket.on('error', error)
  state.socket.emit('joinQRSession', { malicious: true })
  expect(error).toHaveBeenCalledOnce()
  expect(state.socket.join).not.toHaveBeenCalled()
  const sessionId = 'f5bc5b34-0e4f-4e58-832b-edecf6778ea3'
  state.socket.emit('joinQRSession', sessionId)
  expect(joined).toHaveBeenCalledWith({ sessionId })
  state.socket.emit('leaveQRSession', sessionId)
  expect(state.socket.leave).toHaveBeenCalledWith('qr-session:' + sessionId)
  expect(services.verify).not.toHaveBeenCalled()
})
