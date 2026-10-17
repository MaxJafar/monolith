import { type DraftScope, type DraftStore, type LocalDraft } from './draftStore'
import { registerSignOutGuard } from './sessionGuards'
import {
  type EditorDocumentV2,
  type EditorSnapshot,
  type GatewayClient,
  GatewayError
} from './transport'

export type SaveStatus =
  'saved' | 'local' | 'saving' | 'offline' | 'conflict' | 'expired' | 'error'
export type DraftState = {
  status: SaveStatus
  error?: string
  current?: EditorDocumentV2
  dirty: boolean
}
type DocumentGateway = Pick<GatewayClient, 'document' | 'save' | 'recover'>

/** Serializes local writes, server saves and recovery. The local version is a
 * compare-and-swap token: another tab cannot silently replace this draft. */
export class DraftController {
  state: DraftState = { status: 'saved', dirty: false }
  private draft: LocalDraft
  private persistedVersion: number | null = null
  private localWrites: Promise<void> = Promise.resolve()
  private saving: Promise<void> | null = null
  private idleTimer: ReturnType<typeof setTimeout> | undefined
  private maxTimer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  private resolving = false
  private subscribers = new Set<() => void>()
  private localFailure: Error | undefined
  private unregister?: () => void
  constructor(
    private document: EditorDocumentV2,
    readonly scope: DraftScope,
    private readonly store: DraftStore,
    private readonly gateway: DocumentGateway
  ) {
    this.draft = {
      ...scope,
      formatVersion: 1,
      version: 0,
      baselineRevision: document.revision,
      snapshot: document.snapshot,
      dirty: false,
      updatedAt: new Date().toISOString()
    }
  }
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener)
    return () => {
      this.subscribers.delete(listener)
    }
  }
  getState = () => this.state
  get snapshot() {
    return this.draft.snapshot
  }
  private notify(state: DraftState) {
    this.state = state
    for (const listener of this.subscribers) listener()
  }
  async initialize(readOnly = false) {
    const existing = await this.store.get(this.scope)
    if (this.disposed) return this.snapshot
    this.unregister ??= registerSignOutGuard(async () => {
      await this.localWrites
      if (this.draft.dirty)
        throw new Error('Resolve unsaved document drafts before signing out')
    })
    this.persistedVersion = existing?.version ?? null
    this.draft.version = existing?.version ?? 0
    if (existing?.dirty) {
      this.draft = existing
      this.notify({
        status:
          existing.baselineRevision === this.document.revision
            ? 'local'
            : 'conflict',
        dirty: true,
        ...(existing.baselineRevision !== this.document.revision
          ? { current: this.document }
          : {})
      })
    } else if (!readOnly) {
      this.draft.version = (existing?.version ?? 0) + 1
      await this.persist()
    }
    return this.snapshot
  }
  private persist() {
    const draft = structuredClone(this.draft)
    const write = this.localWrites.then(async () => {
      if (this.localFailure) throw this.localFailure
      await this.store.put(draft, this.persistedVersion)
      this.persistedVersion = draft.version
    })
    // Preserve failure state without leaving an unhandled rejected queue.
    this.localWrites = write.catch(error => {
      this.localFailure =
        error instanceof Error ? error : new Error(String(error))
      this.notify({
        status: 'error',
        dirty: this.draft.dirty,
        error: this.localFailure.message
      })
    })
    return write
  }
  edit(snapshot: EditorSnapshot) {
    if (this.disposed || this.resolving || this.document.recovery) return
    this.draft = {
      ...this.draft,
      snapshot: structuredClone(snapshot),
      version: this.draft.version + 1,
      dirty: true,
      updatedAt: new Date().toISOString()
    }
    const blocked = ['conflict', 'expired', 'error'].includes(this.state.status)
    this.notify({
      ...this.state,
      status: blocked ? this.state.status : 'local',
      dirty: true
    })
    void this.persist().catch(() => {})
    if (!blocked) this.schedule()
  }
  private schedule() {
    clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      void this.flush()
    }, 750)
    this.maxTimer ??= setTimeout(() => {
      void this.flush()
    }, 3000)
  }
  private clearTimers() {
    clearTimeout(this.idleTimer)
    clearTimeout(this.maxTimer)
    this.idleTimer = this.maxTimer = undefined
  }
  async flush() {
    this.clearTimers()
    if (this.saving) return this.saving
    if (
      this.disposed ||
      this.resolving ||
      !this.draft.dirty ||
      ['conflict', 'expired', 'error'].includes(this.state.status)
    )
      return
    this.saving = this.save().finally(() => {
      this.saving = null
      if (this.draft.dirty && this.state.status === 'local' && !this.disposed)
        this.schedule()
    })
    return this.saving
  }
  private async save() {
    await this.localWrites
    if (this.localFailure) return
    const sent = structuredClone(this.draft)
    this.notify({ status: 'saving', dirty: true })
    try {
      // A fresh read prevents an offline draft from overwriting a competing save.
      // PUT's expectedRevision still arbitrates the race after this read.
      const current = await this.gateway.document(
        this.document.workspaceId,
        this.document.source
      )
      if (current.revision !== sent.baselineRevision || current.recovery) {
        this.notify({ status: 'conflict', current, dirty: true })
        return
      }
      const saved = await this.gateway.save(
        { ...this.document, revision: sent.baselineRevision },
        sent.snapshot
      )
      this.document = saved
      const dirty = this.draft.version !== sent.version
      this.draft = {
        ...this.draft,
        version: this.draft.version + 1,
        baselineRevision: saved.revision,
        dirty,
        ...(dirty ? {} : { snapshot: saved.snapshot })
      }
      await this.persist()
      // IndexedDB and native writes yield. A newer edit may arrive while this
      // acknowledgement is persisted; never label that newer draft as saved.
      if (this.localFailure) return
      const pending = this.draft.dirty
      this.notify({ status: pending ? 'local' : 'saved', dirty: pending })
    } catch (error) {
      if (this.localFailure) return
      if (error instanceof GatewayError) {
        const status =
          error.status === 409 || error.status === 423
            ? 'conflict'
            : error.status === 401
              ? 'expired'
              : 'error'
        this.notify({
          status,
          dirty: true,
          error: error.message,
          current: error.current
        })
      } else this.notify({ status: 'offline', dirty: true })
    }
  }
  async reconnect() {
    if (this.state.status === 'expired' || this.state.status === 'offline')
      this.notify({ status: 'local', dirty: this.draft.dirty })
    await this.flush()
  }
  async useServerVersion(): Promise<EditorDocumentV2> {
    this.resolving = true
    this.clearTimers()
    try {
      await this.saving
      const current = await this.gateway.document(
        this.document.workspaceId,
        this.document.source
      )
      this.document = current
      this.draft = {
        ...this.draft,
        version: this.draft.version + 1,
        baselineRevision: current.revision,
        snapshot: current.snapshot,
        dirty: false,
        updatedAt: new Date().toISOString()
      }
      await this.persist()
      this.notify({ status: 'saved', dirty: false })
      return current
    } finally {
      this.resolving = false
    }
  }
  async recoverAsPage(title: string) {
    this.resolving = true
    this.clearTimers()
    try {
      await this.saving
      await this.localWrites
      const recovery = await this.gateway.recover(
        this.document,
        this.draft.snapshot,
        title
      )
      // Only mark the original draft resolved after the server committed a copy.
      this.draft = {
        ...this.draft,
        version: this.draft.version + 1,
        dirty: false
      }
      // A conflicting local tab owns the persisted draft. Preserve its copy;
      // this window's in-memory content is now safely in the recovery page.
      if (!this.localFailure) await this.persist()
      this.notify({ status: 'saved', dirty: false })
      return recovery
    } finally {
      this.resolving = false
    }
  }
  async dispose() {
    this.disposed = true
    this.clearTimers()
    await this.saving
    await this.localWrites
    this.subscribers.clear()
    this.unregister?.()
  }
}
