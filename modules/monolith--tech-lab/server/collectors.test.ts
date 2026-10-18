import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  registerTechLabCollector,
  startTechLabDispatcher,
  stopTechLabCollectors
} from './collectors'
import type { TechLabDatabase } from './store'

const mocks = vi.hoisted(() => ({ due: vi.fn(), run: vi.fn(), prune: vi.fn() }))
vi.mock('./store', () => ({
  getDueMonitorIds: mocks.due,
  runTechLabChecks: mocks.run,
  pruneChecks: mocks.prune
}))

function fixture(enabled = true) {
  const transaction = {
    execute: vi.fn().mockResolvedValue([]),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(enabled ? [{ id: 'service' }] : [])
        })
      })
    })
  }
  const db = {
    transaction: vi.fn(
      async (callback: (tx: typeof transaction) => Promise<void>) =>
        callback(transaction)
    )
  }

  return {
    db: db as unknown as TechLabDatabase,
    transact: db.transaction,
    tx: transaction
  }
}

describe('owner-scoped background collectors', () => {
  const dispatchers: ReturnType<typeof startTechLabDispatcher>[] = []
  beforeEach(() => {
    vi.useFakeTimers()

    mocks.due.mockResolvedValue(['service'])
    mocks.run.mockResolvedValue({ checks: [], skipped: 0 })
    mocks.prune.mockResolvedValue(undefined)
  })
  afterEach(() => {
    for (const dispatcher of dispatchers.splice(0)) dispatcher.stop()
    stopTechLabCollectors()

    vi.useRealTimers()

    vi.clearAllMocks()
  })
  it('deduplicates visits and creates a fresh scoped transaction on each tick', async () => {
    const fixtureDb = fixture()
    registerTechLabCollector(fixtureDb.db, 'owner-a')
    registerTechLabCollector(fixtureDb.db, 'owner-a')
    await vi.advanceTimersByTimeAsync(1000)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(1)
    expect(fixtureDb.tx.execute).toHaveBeenCalledTimes(1)
    expect(mocks.run).toHaveBeenCalledWith(
      fixtureDb.tx,
      'owner-a',
      ['service'],
      { due_only: true }
    )
    await vi.advanceTimersByTimeAsync(30000)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(2)
  })
  it('does not overlap a long running owner check', async () => {
    let finish!: () => void
    mocks.run.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        })
    )
    const fixtureDb = fixture()
    registerTechLabCollector(fixtureDb.db, 'owner-a')
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(90000)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(1)
    finish()
    await vi.advanceTimersByTimeAsync(30001)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(2)
  })
  it('retries a database failure without inventing an outage', async () => {
    const fixtureDb = fixture()
    fixtureDb.transact.mockRejectedValueOnce(new Error('unavailable'))
    registerTechLabCollector(fixtureDb.db, 'owner-a')
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(30000)
    expect(mocks.run).toHaveBeenCalledTimes(1)
  })
  it('releases idle owners and can resume after a monitor is saved', async () => {
    const fixtureDb = fixture(false)
    mocks.due.mockResolvedValue([])
    registerTechLabCollector(fixtureDb.db, 'owner-a')
    await vi.advanceTimersByTimeAsync(61000)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(1)
    registerTechLabCollector(fixtureDb.db, 'owner-a')
    await vi.advanceTimersByTimeAsync(1000)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(2)
  })
  it('discovers saved monitors at server startup without a browser visit', async () => {
    const fixtureDb = fixture()
    const listOwners = vi
      .fn()
      .mockResolvedValue(['owner-a', 'owner-a', 'owner-b'])
    dispatchers.push(startTechLabDispatcher({ db: fixtureDb.db, listOwners }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(listOwners).toHaveBeenCalledWith(64)
    expect(fixtureDb.transact).toHaveBeenCalledTimes(2)
    expect(mocks.run.mock.calls.map(call => call[1]).sort()).toEqual([
      'owner-a',
      'owner-b'
    ])
  })
  it('deduplicates discovery and suppresses late owner registration after stopping', async () => {
    let finish!: (owners: string[]) => void

    const listOwners = vi.fn(
      () =>
        new Promise<string[]>(resolve => {
          finish = resolve
        })
    )
    const fixtureDb = fixture()
    const dispatcher = startTechLabDispatcher({ db: fixtureDb.db, listOwners })
    dispatchers.push(dispatcher)
    const one = dispatcher.tick()
    const two = dispatcher.tick()
    expect(one).toBe(two)
    expect(listOwners).toHaveBeenCalledTimes(1)
    dispatcher.stop()
    finish(['owner-a'])
    await one
    await vi.advanceTimersByTimeAsync(61000)
    expect(fixtureDb.transact).not.toHaveBeenCalled()
  })
  it('recovers from discovery failures and exposes only a sanitized error code', async () => {
    const fixtureDb = fixture()
    const listOwners = vi
      .fn()
      .mockRejectedValueOnce(new Error('private connection'))
      .mockResolvedValue(['owner-a'])
    const onError = vi.fn()
    dispatchers.push(
      startTechLabDispatcher({ db: fixtureDb.db, listOwners, onError })
    )
    await vi.advanceTimersByTimeAsync(1000)
    expect(onError).toHaveBeenCalledWith('tech_lab_owner_discovery_failed')
    await vi.advanceTimersByTimeAsync(30000)
    expect(mocks.run).toHaveBeenCalledTimes(1)
  })
})
