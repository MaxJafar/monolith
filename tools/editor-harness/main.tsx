import { Text } from '@blocksuite/store'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { DocumentAdapter } from '../../packages/ui/src/components/display/DocumentEditor/adapter'
import { DocumentSlashMenu } from '../../packages/ui/src/components/display/DocumentEditor/SlashMenu'
import '../../packages/ui/src/components/display/DocumentEditor/document.css'
import { bindDocumentInteractions } from '../../packages/ui/src/components/display/DocumentEditor/interactions'
import type { EmbedMount } from '../../packages/ui/src/components/display/DocumentEditor/views'
import { DocumentWorkspace } from '../../packages/ui/src/components/display/DocumentEditor/workspace'
import './harness.css'

declare global {
  interface Window {
    monolithHarness?: DocumentAdapter
  }
}

function HarnessEmbed({ embed }: { embed: EmbedMount }) {
  const [name, setName] = useState('Launch review')
  return (
    <section className="harness-embed" aria-label="Linked database">
      <strong>Release tasks</strong>
      <span>Linked view · server-owned records</span>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input
                aria-label="Task name"
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </td>
            <td>In review</td>
          </tr>
        </tbody>
      </table>
      <small>{String(embed.props.baseId)}</small>
    </section>
  )
}

function Harness() {
  const mount = useRef<HTMLDivElement>(null)
  const [adapter, setAdapter] = useState<DocumentAdapter>()
  const [embeds, setEmbeds] = useState<Map<string, EmbedMount>>(new Map())
  const [renders, setRenders] = useState(0)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState('')
  const [databaseRequest, setDatabaseRequest] = useState('')
  useEffect(() => {
    const workspace = new DocumentWorkspace('harness-workspace')
    const store = workspace.createDoc('harness-document').getStore()
    store.load()
    const root = store.addBlock('affine:page', {
      title: new Text('A calmer place to work')
    })
    store.addBlock('affine:surface', {}, root)
    const note = store.addBlock('affine:note', {}, root)
    for (const text of [
      'First paragraph',
      'Second paragraph',
      'Third paragraph'
    ])
      store.addBlock('affine:paragraph', { text: new Text(text) }, note)
    const list = store.addBlock(
      'affine:list',
      { type: 'bulleted', text: new Text('Parent list') },
      note
    )
    store.addBlock(
      'affine:list',
      { type: 'bulleted', text: new Text('Nested list') },
      list
    )
    const runtime = new DocumentAdapter(store, {
      label: 'Inline database',
      layouts: { table: 'Table', kanban: 'Board', calendar: 'Calendar', gallery: 'Gallery', list: 'List' },
      choose: (blockId, mode) => setDatabaseRequest(JSON.stringify({ blockId, mode }))
    })
    const columns = runtime.addColumns(2, note)!
    store.getModelById(columns)!.children.forEach((column, index) => {
      const paragraph = column.children[0]
      store.updateBlock(paragraph, { text: new Text(`Column ${index + 1}`) })
    })
    for (let index = 0; index < 3; index++)
      store.addBlock(
        'monolith:linked-database',
        {
          workspaceId: 'workspace',
          baseId: 'shared-base',
          viewId: `view-${index}`
        },
        note
      )
    const count = new URLSearchParams(location.search).has('large') ? 500 : 10
    for (let index = 0; index < count; index++)
      store.addBlock(
        'affine:paragraph',
        { text: new Text(`Working note ${index + 1}`) },
        note
      )
    store.resetHistory()
    runtime.host.addEventListener('monolith-embed', event => {
      const detail = (event as CustomEvent<EmbedMount>).detail
      setEmbeds(previous => {
        if (previous.get(detail.id)?.container === detail.container)
          return previous
        return new Map(previous).set(detail.id, detail)
      })
    })
    mount.current!.append(runtime.host)
    const unbind = bindDocumentInteractions(runtime, {
      selectBlock: 'Select or drag block',
      movingBlocks: count => `${count} blocks`,
      error: failure => setError(String(failure))
    })
    window.monolithHarness = runtime
    setAdapter(runtime)
    return () => {
      unbind()
      runtime.dispose()
      workspace.dispose()
      delete window.monolithHarness
    }
  }, [])
  return (
    <main>
      <output aria-label="Database command">{databaseRequest}</output>
      <header>
        <a href="/">monolith</a>
        <span>Editor interaction harness · BlockSuite 0.22.4</span>
      </header>
      <nav aria-label="Harness controls">
        <button onClick={() => setRenders(value => value + 1)}>
          Rerender shell ({renders})
        </button>
        <button onClick={() => adapter?.store.undo()}>Undo</button>
        <button onClick={() => adapter?.store.redo()}>Redo</button>
        <button onClick={() => void adapter?.duplicate()}>Duplicate</button>
        <button
          onClick={() =>
            setSnapshot(JSON.stringify(adapter?.snapshot(), null, 2))
          }
        >
          Inspect snapshot
        </button>
        <button
          onClick={async () => {
            if (!adapter) return
            const snapshot = adapter.snapshot()
            const workspace = new DocumentWorkspace('roundtrip')
            const scratch = workspace.createDoc('scratch').getStore()
            scratch.load()
            const restored = await scratch
              .getTransformer()
              .snapshotToDoc(snapshot)
            const result = restored?.getTransformer().docToSnapshot(restored)
            setSnapshot(
              JSON.stringify(
                {
                  equivalent:
                    JSON.stringify(snapshot.blocks) ===
                    JSON.stringify(result?.blocks),
                  result
                },
                null,
                2
              )
            )
            workspace.dispose()
          }}
        >
          Round-trip snapshot
        </button>
        <button
          onClick={() => {
            if (adapter) {
              adapter.store.readonly = !adapter.store.readonly
              setRenders(value => value + 1)
            }
          }}
        >
          Toggle read-only
        </button>
      </nav>
      <p className="harness-hint">
        Use a block grip to select. Shift extends the range; Ctrl toggles. Drag
        selected blocks together. Ctrl+Alt+↑/↓ moves; Ctrl+D duplicates.
      </p>
      {error && <p role="alert">{error}</p>}
      <div ref={mount} className="harness-document" />
      {adapter && <DocumentSlashMenu adapter={adapter} />}
      {Array.from(embeds.values()).map(embed =>
        createPortal(<HarnessEmbed embed={embed} />, embed.container, embed.id)
      )}
      <pre data-testid="snapshot">{snapshot}</pre>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Harness />)
