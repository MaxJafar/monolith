import type { EditorSnapshot, EditorSource, NativeHost } from './transport'

export type DraftScope = {
  serverId: string
  accountId: string
  workspaceId: string
  source: EditorSource
}
export type LocalDraft = DraftScope & {
  formatVersion: 1
  version: number
  baselineRevision: number
  snapshot: EditorSnapshot
  updatedAt: string
  dirty: boolean
}
export function draftKey(scope: DraftScope) {
  return JSON.stringify([
    scope.serverId,
    scope.accountId,
    scope.workspaceId,
    scope.source.kind,
    scope.source.id
  ])
}
export interface DraftStore {
  get(scope: DraftScope): Promise<LocalDraft | null>
  put(draft: LocalDraft, expectedVersion: number | null): Promise<void>
  remove(scope: DraftScope, expectedVersion: number): Promise<void>
  list(serverId: string, accountId: string): Promise<LocalDraft[]>
}
function validDraft(value: unknown): value is LocalDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as LocalDraft
  return (
    draft.formatVersion === 1 &&
    Number.isSafeInteger(draft.version) &&
    Number.isSafeInteger(draft.baselineRevision) &&
    typeof draft.dirty === 'boolean' &&
    !!draft.serverId &&
    !!draft.accountId &&
    !!draft.workspaceId &&
    ['page', 'record', 'note'].includes(draft.source?.kind) &&
    !!draft.source.id &&
    draft.snapshot?.type === 'page' &&
    draft.snapshot.meta.id === draft.source.id
  )
}
function checked(value: unknown): LocalDraft | null {
  if (value == null) return null
  if (!validDraft(value))
    throw new Error(
      'The saved draft needs recovery with a compatible app version'
    )
  return value
}
export class IndexedDBDraftStore implements DraftStore {
  private connection: Promise<IDBDatabase> | undefined
  private db() {
    return (this.connection ??= new Promise((resolve, reject) => {
      const open = indexedDB.open('monolith-document-drafts', 1)
      open.onupgradeneeded = () => {
        open.result.createObjectStore('drafts', { keyPath: 'key' })
      }
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        open.result.onversionchange = () => {
          open.result.close()
          this.connection = undefined
        }
        resolve(open.result)
      }
      open.onblocked = () =>
        reject(
          new Error('Close other Monolith windows to upgrade draft storage')
        )
    }))
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    run: (
      store: IDBObjectStore,
      done: (value: T) => void,
      fail: (error: Error) => void
    ) => void
  ): Promise<T> {
    const db = await this.db()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', mode, { durability: 'strict' })
      let result: T
      tx.oncomplete = () => resolve(result)
      tx.onerror = tx.onabort = () =>
        reject(tx.error ?? new Error('Draft could not be stored'))
      try {
        run(
          tx.objectStore('drafts'),
          value => {
            result = value
          },
          error => {
            reject(error)
            tx.abort()
          }
        )
      } catch (error) {
        reject(error)
        tx.abort()
      }
    })
  }
  get(scope: DraftScope) {
    return this.transaction<LocalDraft | null>(
      'readonly',
      (store, done, fail) => {
        const request = store.get(draftKey(scope))
        request.onsuccess = () => {
          try {
            done(checked(request.result?.value))
          } catch (error) {
            fail(error as Error)
          }
        }
      }
    )
  }
  put(draft: LocalDraft, expectedVersion: number | null) {
    return this.transaction<void>('readwrite', (store, done, fail) => {
      const key = draftKey(draft)
      const request = store.get(key)
      request.onsuccess = () => {
        if ((request.result?.value.version ?? null) !== expectedVersion) {
          fail(
            new Error(
              'This draft changed in another window. Keep this window open to recover your edits.'
            )
          )
          return
        }
        store.put({ key, value: draft })
        done()
      }
    })
  }
  remove(scope: DraftScope, expectedVersion: number) {
    return this.transaction<void>('readwrite', (store, done, fail) => {
      const key = draftKey(scope)
      const request = store.get(key)
      request.onsuccess = () => {
        if (
          request.result &&
          request.result.value.version !== expectedVersion
        ) {
          fail(new Error('A newer draft must be resolved first'))
          return
        }
        store.delete(key)
        done()
      }
    })
  }
  list(serverId: string, accountId: string) {
    return this.transaction<LocalDraft[]>('readonly', (store, done, fail) => {
      const request = store.getAll()
      request.onsuccess = () => {
        try {
          done(
            request.result
              .map(row => checked(row.value))
              .filter(
                (draft): draft is LocalDraft =>
                  !!draft &&
                  draft.serverId === serverId &&
                  draft.accountId === accountId
              )
          )
        } catch (error) {
          fail(error as Error)
        }
      }
    })
  }
}
export class NativeDraftStore implements DraftStore {
  constructor(private readonly host: NativeHost) {}
  async get(scope: DraftScope) {
    const raw = await this.host.readDraft(draftKey(scope))
    return raw ? checked(JSON.parse(raw)) : null
  }
  put(draft: LocalDraft, expectedVersion: number | null) {
    return this.host.writeDraft(
      draftKey(draft),
      JSON.stringify(draft),
      expectedVersion
    )
  }
  remove(scope: DraftScope, expectedVersion: number) {
    return this.host.removeDraft(draftKey(scope), expectedVersion)
  }
  async list(serverId: string, accountId: string) {
    return (await this.host.listDrafts())
      .map(raw => checked(JSON.parse(raw)))
      .filter(
        (draft): draft is LocalDraft =>
          !!draft &&
          draft.serverId === serverId &&
          draft.accountId === accountId
      )
  }
}

export async function assertSignOutResolved(
  store: DraftStore,
  serverId: string,
  accountId: string
) {
  if ((await store.list(serverId, accountId)).some(draft => draft.dirty))
    throw new Error('Resolve unsaved document drafts before signing out')
}
