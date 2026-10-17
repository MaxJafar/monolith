import { afterEach, describe, expect, it, vi } from 'vitest'

import { DraftController } from './draftController'
import {
  type DraftScope,
  type DraftStore,
  type LocalDraft,
  assertSignOutResolved,
  draftKey
} from './draftStore'
import {
  BrowserTransport,
  type EditorDocumentV2,
  GatewayClient,
  GatewayError,
  normalizeServerURL
} from './transport'

class MemoryDrafts implements DraftStore {
  data = new Map<string, LocalDraft>()
  async get(scope: DraftScope) {
    return structuredClone(this.data.get(draftKey(scope)) ?? null)
  }
  async put(draft: LocalDraft, version: number | null) {
    if ((this.data.get(draftKey(draft))?.version ?? null) !== version)
      throw new Error('Draft changed in another window')
    this.data.set(draftKey(draft), structuredClone(draft))
  }
  async remove(scope: DraftScope, version: number) {
    if (this.data.get(draftKey(scope))?.version !== version)
      throw new Error('Draft changed')
    this.data.delete(draftKey(scope))
  }
  async list(serverId: string, accountId: string) {
    return [...this.data.values()].filter(
      row => row.serverId === serverId && row.accountId === accountId
    )
  }
}
const source = { kind: 'page' as const, id: 'document' }
const scope: DraftScope = {
  serverId: 'server',
  accountId: 'account',
  workspaceId: 'workspace',
  source
}
const document: EditorDocumentV2 = {
  source,
  workspaceId: 'workspace',
  revision: 1,
  formatVersion: 2,
  recovery: false,
  updatedAt: '',
  snapshot: {
    type: 'page',
    meta: { id: 'document', title: 'Original', tags: [], createDate: 0 },
    blocks: {
      type: 'block',
      id: 'root',
      flavour: 'affine:page',
      version: 2,
      props: {},
      children: []
    }
  }
}
const snapshot = (title: string) => ({
  ...structuredClone(document.snapshot),
  meta: { ...document.snapshot.meta, title }
})
function setup(store = new MemoryDrafts()) {
  let current = structuredClone(document)
  const gateway = {
    document: vi.fn(async () => structuredClone(current)),
    save: vi.fn(
      async (doc: EditorDocumentV2, body: EditorDocumentV2['snapshot']) => {
        if (doc.revision !== current.revision)
          throw new GatewayError(409, 'revision_conflict', 'Conflict', current)
        current = { ...doc, revision: doc.revision + 1, snapshot: body }
        return structuredClone(current)
      }
    ),
    recover: vi.fn(
      async (_doc: EditorDocumentV2, body: EditorDocumentV2['snapshot']) => ({
        ...current,
        source: { kind: 'page' as const, id: 'recovery' },
        snapshot: { ...body, meta: { ...body.meta, id: 'recovery' } }
      })
    )
  }
  return {
    store,
    gateway,
    controller: new DraftController(document, scope, store, gateway),
    compete: () => {
      current.revision++
    }
  }
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('durable revision-checked drafts', () => {
  it('writes locally before the 750ms idle save, and limits continuous typing to 3 seconds', async () => {
    vi.useFakeTimers()
    const { controller, store, gateway } = setup()
    await controller.initialize()
    controller.edit(snapshot('One'))
    await vi.advanceTimersByTimeAsync(749)
    expect((await store.get(scope))?.snapshot.meta.title).toBe('One')
    expect(gateway.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(gateway.save).toHaveBeenCalledTimes(1)
    expect(controller.state.status).toBe('saved')
    controller.edit(snapshot('Typing'))
    for (let i = 0; i < 7; i++) {
      await vi.advanceTimersByTimeAsync(400)
      controller.edit(snapshot(`Typing ${i}`))
    }
    expect(gateway.save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(200)
    expect(gateway.save).toHaveBeenCalledTimes(2)
    await controller.dispose()
  })
  it('restores a crashed offline draft and refuses to overwrite a competing server save', async () => {
    const first = setup()
    await first.controller.initialize()
    first.controller.edit(snapshot('Offline work'))
    first.gateway.document.mockRejectedValue(
      new TypeError('Network unavailable')
    )
    await first.controller.flush()
    expect(first.controller.state.status).toBe('offline')
    await first.controller.dispose()
    const next = setup(first.store)
    await next.controller.initialize()
    expect(next.controller.snapshot.meta.title).toBe('Offline work')
    next.compete()
    await next.controller.flush()
    expect(next.controller.state.status).toBe('conflict')
    expect(next.gateway.save).not.toHaveBeenCalled()
    const recovery = await next.controller.recoverAsPage('Recovered copy')
    expect(recovery.source.id).toBe('recovery')
    expect(recovery.snapshot.meta.title).toBe('Offline work')
    await expect(
      assertSignOutResolved(next.store, 'server', 'account')
    ).resolves.toBeUndefined()
    await next.controller.dispose()
  })
  it('retains edits made while a save is in flight and advances their baseline', async () => {
    const { controller, gateway, store } = setup()
    await controller.initialize()
    let finish!: (doc: EditorDocumentV2) => void
    gateway.save.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    controller.edit(snapshot('Sent'))
    const saving = controller.flush()
    await vi.waitFor(() => expect(gateway.save).toHaveBeenCalled())
    controller.edit(snapshot('Still typing'))
    finish({ ...document, revision: 2, snapshot: snapshot('Sent') })
    await saving
    expect(controller.state).toEqual({ status: 'local', dirty: true })
    expect((await store.get(scope))?.baselineRevision).toBe(2)
    expect((await store.get(scope))?.snapshot.meta.title).toBe('Still typing')
    await controller.dispose()
  })
  it('does not report saved when an edit arrives during local save acknowledgement', async () => {
    const { controller, gateway, store } = setup()
    await controller.initialize()
    const write = store.put.bind(store)
    let acknowledge!: () => void
    const acknowledgement = new Promise<void>(resolve => {
      acknowledge = resolve
    })
    let started!: () => void
    const writing = new Promise<void>(resolve => {
      started = resolve
    })
    let paused = false
    vi.spyOn(store, 'put').mockImplementation(async (draft, version) => {
      if (!paused && !draft.dirty && draft.baselineRevision === 2) {
        paused = true
        started()
        await acknowledgement
      }
      await write(draft, version)
    })
    controller.edit(snapshot('Sent'))
    const saving = controller.flush()
    await writing
    controller.edit(snapshot('Newer edit'))
    acknowledge()
    await saving
    expect(controller.state).toEqual({ status: 'local', dirty: true })
    await controller.flush()
    expect(gateway.save).toHaveBeenCalledTimes(2)
    expect(controller.state).toEqual({ status: 'saved', dirty: false })
    expect((await store.get(scope))?.snapshot.meta.title).toBe('Newer edit')
    await controller.dispose()
  })
  it('keeps drafts through expired authentication, blocks sign-out, and isolates accounts and servers', async () => {
    const { controller, gateway, store } = setup()
    await controller.initialize()
    controller.edit(snapshot('Private draft'))
    gateway.document.mockRejectedValue(
      new GatewayError(401, 'expired', 'Sign in again')
    )
    await controller.flush()
    expect(controller.state.status).toBe('expired')
    await expect(
      assertSignOutResolved(store, 'server', 'account')
    ).rejects.toThrow('Resolve')
    expect(await store.get({ ...scope, accountId: 'other' })).toBeNull()
    expect(await store.get({ ...scope, serverId: 'other' })).toBeNull()
    await controller.dispose()
  })
  it('detects two windows competing for the same local draft', async () => {
    const first = setup()
    await first.controller.initialize()
    const second = setup(first.store)
    await second.controller.initialize()
    first.controller.edit(snapshot('First window'))
    await first.controller.flush()
    expect(first.controller.state.status).toBe('error')
    expect(first.gateway.save).not.toHaveBeenCalled()
    expect(first.controller.snapshot.meta.title).toBe('First window')
    await first.controller.dispose()
    await second.controller.dispose()
  })
  it('does not persist an abandoned mount and preserves draft versions across preview/edit', async () => {
    const first = setup()
    const initializing = first.controller.initialize()
    await first.controller.dispose()
    await initializing
    expect(await first.store.get(scope)).toBeNull()
    const saved = setup(first.store)
    await saved.controller.initialize()
    saved.controller.edit(snapshot('Saved'))
    await saved.controller.flush()
    await saved.controller.dispose()
    const preview = setup(first.store)
    await preview.controller.initialize(true)
    preview.controller.edit(snapshot('Edited after preview'))
    await preview.controller.flush()
    expect(preview.controller.state.status).toBe('saved')
    expect((await first.store.get(scope))?.snapshot.meta.title).toBe(
      'Edited after preview'
    )
    await preview.controller.dispose()
  })
  it('loads the current server version only after explicit resolution', async () => {
    const { controller, gateway } = setup()
    await controller.initialize()
    controller.edit(snapshot('Local'))
    gateway.document.mockResolvedValue({
      ...document,
      revision: 9,
      snapshot: snapshot('Server')
    })
    await controller.flush()
    expect(controller.snapshot.meta.title).toBe('Local')
    await controller.useServerVersion()
    expect(controller.snapshot.meta.title).toBe('Server')
    expect(controller.state.dirty).toBe(false)
    await controller.dispose()
  })
})

describe('scoped transport', () => {
  it('requires HTTPS and rejects URLs with credentials or paths', () => {
    expect(normalizeServerURL('monolith.example.ts.net')).toBe(
      'https://monolith.example.ts.net'
    )
    for (const url of [
      'http://example.com',
      'https://name:password@example.com',
      'https://example.com/a',
      'https://example.com?q=1'
    ])
      expect(() => normalizeServerURL(url)).toThrow()
  })
  it('rejects external request paths and disables redirects', async () => {
    const fetch = vi.fn(
      async (_url: RequestInfo | URL, _options?: RequestInit) =>
        new Response('{}', { status: 200 })
    )
    vi.stubGlobal('fetch', fetch)
    const transport = new BrowserTransport('https://monolith.test')
    await expect(
      transport.request({ path: '//attacker.test/api' })
    ).rejects.toThrow()
    await transport.request({ path: '/api/v1/device-sessions' })
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' })
  })
  it('derives cache keys from the operation and isolates identity', () => {
    const transport = { request: vi.fn() }
    const one = new GatewayClient(transport, scope)
    const two = new GatewayClient(transport, { ...scope, accountId: 'other' })
    expect(one.key('document', { id: 'x' })).toContain(
      '/api/v1/editor-documents/{kind}/{id}'
    )
    expect(one.key('document')).not.toEqual(two.key('document'))
  })
})
