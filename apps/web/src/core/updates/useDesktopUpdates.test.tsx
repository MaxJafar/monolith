// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { emptyUpdateStatus } from '@monolith/configs'

import { guardUpdateRestart, useDesktopUpdates } from './useDesktopUpdates'

const mocks = vi.hoisted(() => ({ updater: vi.fn(), guard: vi.fn() }))
vi.mock('@monolith/api', () => ({
  getDesktopUpdater: () => mocks.updater,
  checkSignOutGuards: mocks.guard
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined, controller: ReturnType<typeof useDesktopUpdates>

function Probe() {
  const value = useDesktopUpdates()

  useEffect(() => {
    controller = value
  }, [value])

  return null
}
beforeEach(() => {
  mocks.guard.mockReset().mockResolvedValue(undefined)
  mocks.updater.mockReset().mockResolvedValue({
    ...emptyUpdateStatus('1.0.0', 'windows-amd64'),
    configured: true,
    phase: 'ready',
    preferences: {
      channel: 'stable',
      autoDownload: true,
      autoInstall: true,
      installHourUTC: 3
    }
  })
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()

  vi.useRealTimers()
})

async function mount() {
  const element = document.createElement('div')
  element.id = 'app'
  document.body.append(element)
  root = createRoot(element)
  await act(async () => root!.render(<Probe />))

  return element
}
it('blocks restart while an editor reports unsaved work', async () => {
  mocks.guard.mockRejectedValue(Error('Unsaved draft'))
  await expect(guardUpdateRestart()).rejects.toThrow('Unsaved draft')
  expect(mocks.updater).not.toHaveBeenCalled()
})
it('respects browser beforeunload guards', async () => {
  const block = (event: Event) => event.preventDefault()
  window.addEventListener('beforeunload', block)

  try {
    await expect(guardUpdateRestart()).rejects.toThrow('unsaved changes')
  } finally {
    window.removeEventListener('beforeunload', block)
  }
})
it('does not send install or rollback when draft flushing fails', async () => {
  await mount()
  mocks.guard.mockRejectedValue(Error('Draft could not be saved'))
  for (const action of ['install', 'rollback'] as const)
    await act(async () => controller.act(action))
  expect(
    mocks.updater.mock.calls.every(([action]) => action === 'status')
  ).toBe(true)
  expect(controller.error).toContain('Draft could not be saved')
})
it('restores editing after the native update command fails', async () => {
  const element = await mount()
  mocks.updater.mockImplementation(async action => {
    if (action === 'install') throw Error('Not enough disk space')

    return emptyUpdateStatus('1.0.0')
  })
  await act(async () => controller.act('install'))
  expect(element.inert).toBe(false)
  expect(controller.error).toBe('Not enough disk space')
  expect(controller.pending).toBe(false)
})
it('automatically installs only after a hidden idle period and clean drafts', async () => {
  vi.useFakeTimers()

  const visibility = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('visible')
  await mount()
  await act(async () => vi.advanceTimersByTimeAsync(130000))
  expect(
    mocks.updater.mock.calls.some(([action]) => action === 'install')
  ).toBe(false)
  visibility.mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await act(async () => vi.advanceTimersByTimeAsync(110000))
  expect(
    mocks.updater.mock.calls.some(([action]) => action === 'install')
  ).toBe(false)
  mocks.guard.mockRejectedValueOnce(Error('Still saving'))
  await act(async () => vi.advanceTimersByTimeAsync(20000))
  expect(
    mocks.updater.mock.calls.some(([action]) => action === 'install')
  ).toBe(false)
  await act(async () => vi.advanceTimersByTimeAsync(70000))
  expect(
    mocks.updater.mock.calls.filter(([action]) => action === 'install')
  ).toHaveLength(1)
})
it('cancels an automatic restart when the user returns during draft flushing', async () => {
  vi.useFakeTimers()

  const visibility = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('hidden')
  await mount()
  mocks.guard.mockImplementation(async () => {
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await act(async () => vi.advanceTimersByTimeAsync(140000))
  expect(
    mocks.updater.mock.calls.some(([action]) => action === 'install')
  ).toBe(false)
})
