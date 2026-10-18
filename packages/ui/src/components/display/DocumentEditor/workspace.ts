import { NoopLogger } from '@blocksuite/affine/global/utils'
import {
  AwarenessStore,
  type Doc,
  type DocMeta,
  type DocsPropertiesMeta,
  type ExtensionType,
  type GetStoreOptions,
  type RemoveStoreOptions,
  type Store,
  StoreContainer,
  type Workspace,
  type WorkspaceMeta,
  type YBlock
} from '@blocksuite/store'
import { BlobEngine, type BlobSource } from '@blocksuite/sync'
import { Subject } from 'rxjs'
import { Awareness } from 'y-protocols/awareness.js'
import * as Y from 'yjs'

import { editorStoreExtensions } from './adapter'

class DocumentMetadata implements WorkspaceMeta {
  docMetas: DocMeta[] = []
  properties: DocsPropertiesMeta = {}
  docMetaAdded = new Subject<string>()
  docMetaRemoved = new Subject<string>()
  docMetaUpdated = new Subject<void>()
  get docs() {
    return this.docMetas
  }
  initialize() {}
  getDocMeta(id: string) {
    return this.docMetas.find(meta => meta.id === id)
  }
  addDocMeta(props: DocMeta, index = this.docMetas.length) {
    if (this.getDocMeta(props.id))
      throw new Error('Duplicate document identity')
    this.docMetas.splice(index, 0, props)
    this.docMetaAdded.next(props.id)
  }
  setDocMeta(id: string, props: Partial<DocMeta>) {
    const meta = this.getDocMeta(id)
    if (meta) {
      Object.assign(meta, props, { id })
      this.docMetaUpdated.next()
    }
  }
  removeDocMeta(id: string) {
    this.docMetas = this.docMetas.filter(meta => meta.id !== id)
    this.docMetaRemoved.next(id)
  }
  setProperties(props: DocsPropertiesMeta) {
    this.properties = props
  }
  dispose() {
    this.docMetaAdded.complete()
    this.docMetaRemoved.complete()
    this.docMetaUpdated.complete()
  }
}

class LocalDocument implements Doc {
  readonly spaceDoc: Y.Doc
  readonly yBlocks: Y.Map<YBlock>
  readonly awarenessStore: AwarenessStore
  private readonly container: StoreContainer
  private readonly stores = new Set<Store>()
  ready = false
  loaded = false
  constructor(
    readonly id: string,
    readonly workspace: DocumentWorkspace
  ) {
    this.spaceDoc = new Y.Doc({ guid: id })
    this.yBlocks = this.spaceDoc.getMap('blocks')
    this.awarenessStore = new AwarenessStore(new Awareness(this.spaceDoc))
    this.container = new StoreContainer(this)
    workspace.doc.getMap('spaces').set(id, this.spaceDoc)
  }
  get rootDoc() {
    return this.workspace.doc
  }
  get meta() {
    return this.workspace.meta.getDocMeta(this.id)
  }
  getStore(options: GetStoreOptions = {}) {
    const store = this.container.getStore({
      ...options,
      id: options.id ?? this.id,
      extensions: [...this.workspace.extensions, ...(options.extensions ?? [])]
    })
    this.stores.add(store)
    return store
  }
  removeStore(options: RemoveStoreOptions) {
    this.container.removeStore(options)
  }
  load(init?: () => void) {
    if (this.ready) return
    this.spaceDoc.load()
    this.loaded = true
    init?.()
    this.ready = true
  }
  clear() {
    this.yBlocks.clear()
  }
  remove() {
    this.workspace.removeDoc(this.id)
  }
  dispose() {
    for (const store of this.stores) store.dispose()
    this.stores.clear()
    this.awarenessStore.destroy()
    this.spaceDoc.destroy()
    this.loaded = this.ready = false
  }
}

// No implicit in-memory upload store: an unsupported attachment must not appear
// saved and then disappear on restart. Application module attachments own their
// existing upload contract; future BlockSuite media can supply a durable source.
const noAttachments: BlobSource = {
  name: 'monolith-document',
  readonly: true,
  get: async () => null,
  list: async () => [],
  set: async () => {
    throw new Error('Document attachment storage is unavailable')
  },
  delete: async () => {
    throw new Error('Document attachment storage is unavailable')
  }
}

/** A local editing session. Canonical snapshots and drafts own persistence;
 * Yjs is never connected to a collaboration server in this release. */
export class DocumentWorkspace implements Workspace {
  readonly doc: Y.Doc
  readonly meta = new DocumentMetadata()
  readonly docs = new Map<string, Doc>()
  readonly slots = { docListUpdated: new Subject<void>() }
  readonly extensions: ExtensionType[] = editorStoreExtensions()
  readonly blobSync: BlobEngine
  readonly idGenerator = () => crypto.randomUUID()
  constructor(
    readonly id: string,
    blobs: BlobSource = noAttachments
  ) {
    this.doc = new Y.Doc({ guid: id })
    this.blobSync = new BlobEngine(blobs, [], new NoopLogger())
  }
  createDoc(id: string = this.idGenerator()) {
    const existing = this.docs.get(id)
    if (existing) return existing
    const doc = new LocalDocument(id, this)
    this.docs.set(id, doc)
    this.meta.addDocMeta({ id, title: '', tags: [], createDate: Date.now() })
    this.slots.docListUpdated.next()
    return doc
  }
  getDoc(id: string) {
    return this.docs.get(id) ?? null
  }
  removeDoc(id: string) {
    this.docs.get(id)?.dispose()
    this.docs.delete(id)
    this.doc.getMap('spaces').delete(id)
    this.meta.removeDocMeta(id)
    this.slots.docListUpdated.next()
  }
  dispose() {
    for (const doc of this.docs.values()) doc.dispose()
    this.docs.clear()
    this.meta.dispose()
    this.slots.docListUpdated.complete()
    this.doc.destroy()
  }
}
