import { registerSignOutGuard } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

import {
  applyDefinition,
  componentFromSelection,
  defaultLayout,
  descendants,
  instantiate,
  layoutDocument,
  mergeSnapshots
} from '../../design'
import {
  type Document,
  type Element,
  type Mode,
  type Page,
  type Peer,
  type Project,
  type Snapshot,
  type SyncRequest,
  type SyncResult,
  documentSchema
} from '../../shared'
import {
  type Point,
  type Tool,
  type Viewport,
  addConnection,
  autoLayout,
  clone,
  duplicateElements,
  makeElement,
  makePage,
  pageBounds,
  removeElements,
  uid
} from './model'
import { useComments } from './useComments'

type Props = {
  project: Project
  readOnly: boolean
  sync: (request: Omit<SyncRequest, 'id'>) => Promise<SyncResult>
  children: ReactNode
}

function useEditorState({
  project,
  readOnly: initialReadOnly,
  sync
}: Omit<Props, 'children'>) {
  const { t } = useModuleTranslation()
  const commentQuery = useComments(project.workspace_id, project.id)

  const [snapshot, setSnapshot] = useState<Snapshot>({
    document: project.document,
    title: project.title
  })

  const [saved, setSaved] = useState(snapshot)
  const [pageId, setPageId] = useState(project.document.pages[0]!.id)
  const [selected, setSelected] = useState<string[]>([])
  const [vectorEditing, setVectorEditing] = useState<string | null>(null)
  const [vectorNode, setVectorNode] = useState<string | null>(null)
  const [presenting, setPresenting] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const [commentPin, setCommentPin] = useState<{
    x: number
    y: number
    element: string | null
  } | null>(null)

  const [activeComment, setActiveComment] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [view, setView] = useState<Viewport>({ x: 60, y: 60, zoom: 1 })

  const [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true)

  const [connectionStart, setConnectionStart] = useState<string | null>(null)
  const [preview, setPreview] = useState<Page | null>(null)
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [error, setError] = useState<string | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [peers, setPeers] = useState<Peer[]>([])

  const [connection, setConnection] = useState<
    'connecting' | 'live' | 'offline'
  >('connecting')

  const [permissionLost, setPermissionLost] = useState(initialReadOnly)

  const readOnly = permissionLost

  const archived = useRef(project.archived)

  const session = useRef(uid()),
    sequence = useRef(1),
    cursor = useRef<Point | null>(null)
  const pending = useRef<{
    base: Snapshot
    next: Snapshot
    sequence: number
  } | null>(null)
  const presence = useRef({
    page: project.document.pages[0]!.id,
    cursor: null as Point | null,
    selection: [] as string[]
  })

  const past = useRef<{ before: Snapshot; after: Snapshot }[]>([]),
    future = useRef<{ before: Snapshot; after: Snapshot }[]>([])
  const revision = useRef(project.revision),
    latest = useRef(snapshot),
    alive = useRef(true)
  const inFlight = useRef<Promise<boolean> | null>(null),
    savedRef = useRef(snapshot)

  const access = useRef({ readOnly, pageId })

  access.current = { readOnly, pageId }
  latest.current = snapshot
  const page =
    snapshot.document.pages.find(p => p.id === pageId) ??
    snapshot.document.pages[0]!
  presence.current = {
    page: page.id,
    cursor: cursor.current,
    selection: selected.slice(0, 50)
  }

  const dirty = useMemo(
    () => JSON.stringify(snapshot) !== JSON.stringify(saved),
    [snapshot, saved]
  )

  const blocker = useBlocker(dirty || status === 'saving')

  useBeforeUnload(event => {
    if (dirty || status === 'saving') {
      event.preventDefault()
      event.returnValue = ''
    }
  })

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  function commit(next: Snapshot) {
    if (readOnly || JSON.stringify(next) === JSON.stringify(latest.current))
      return
    next = { ...next, document: layoutDocument(next.document) }

    if (!documentSchema.safeParse(next.document).success) {
      setError('invalidDocument')

      return
    }
    past.current = [
      ...past.current.slice(-79),
      { before: latest.current, after: next }
    ]
    future.current = []
    latest.current = next
    setSnapshot(next)
    setHistoryVersion(v => v + 1)
  }

  function updatePage(next: Page, base: Page = page) {
    next = clone(next)

    for (const element of next.elements) {
      const old = base.elements.find(e => e.id === element.id)

      if (old?.component && element.component) {
        const changed = Object.keys(element).filter(
          key =>
            !['id', 'component', 'group', 'parent', 'x', 'y'].includes(key) &&
            JSON.stringify(element[key as keyof Element]) !==
              JSON.stringify(old[key as keyof Element])
        )
        element.component.overrides = [
          ...new Set([...element.component.overrides, ...changed])
        ]
      }
    }

    const current = latest.current
    const before = {
      ...current,
      document: {
        ...current.document,
        pages: current.document.pages.map(p => (p.id === base.id ? base : p))
      }
    }
    const after = {
      ...current,
      document: {
        ...current.document,
        pages: current.document.pages.map(p => (p.id === next.id ? next : p))
      }
    }
    commit(mergeSnapshots(current, before, after))
  }

  function changeElements(
    ids: string[],
    patch: Partial<Element>,
    includeLocked = false
  ) {
    const moving = descendants(page, ids)
    updatePage({
      ...page,
      elements: page.elements.map(e => {
        if (!ids.includes(e.id) || (e.locked && !includeLocked)) {
          if (
            moving.has(e.id) &&
            !e.locked &&
            (patch.x !== undefined || patch.y !== undefined)
          ) {
            const root = page.elements.find(
              root =>
                ids.includes(root.id) && descendants(page, [root.id]).has(e.id)
            )

            if (root)
              return {
                ...e,
                x: e.x + (patch.x === undefined ? 0 : patch.x - root.x),
                y: e.y + (patch.y === undefined ? 0 : patch.y - root.y)
              }
          }

          return e
        }

        const next = { ...e, ...patch, id: e.id }

        if (e.kind === 'path' && (patch.width || patch.height))
          next.points = e.points.map(p => ({
            x: (p.x * next.width) / e.width,
            y: (p.y * next.height) / e.height
          }))

        return next
      })
    })
  }

  function history(direction: 'undo' | 'redo') {
    if (readOnly) return

    const source = direction === 'undo' ? past : future,
      destination = direction === 'undo' ? future : past
    const next = source.current.pop()

    if (!next) return
    destination.current.push(next)
    const value = mergeSnapshots(
      latest.current,
      direction === 'undo' ? next.after : next.before,
      direction === 'undo' ? next.before : next.after,
      true
    )
    latest.current = value
    setSnapshot(value)
    setSelected([])
    setPreview(null)
    setHistoryVersion(v => v + 1)
  }

  async function persist(): Promise<boolean> {
    if (inFlight.current) return inFlight.current

    const current = latest.current
    const changed = JSON.stringify(current) !== JSON.stringify(savedRef.current)
    const canWrite = !access.current.readOnly && !!current.title.trim()

    if (changed && !current.title.trim()) {
      setError('titleRequired')
      setStatus('error')
    }
    if (changed && canWrite && !pending.current)
      pending.current = {
        base: clone(savedRef.current),
        next: clone(current),
        sequence: sequence.current
      }

    const sending = canWrite ? pending.current : null

    if (sending) {
      setStatus('saving')
      setError(null)
    }

    const task = (async () => {
      try {
        const result = await sync({
          session: session.current,
          revision: revision.current,
          presence: { ...presence.current, cursor: cursor.current },
          ...(sending ? { change: sending } : {})
        })

        if (!alive.current) return true
        setPeers(result.peers)
        setConnection('live')
        if (result.project) archived.current = result.project.archived
        setPermissionLost(result.role === 'viewer' || archived.current)

        if (result.project && result.project.revision >= revision.current) {
          const incoming = {
            title: result.project.title,
            document: result.project.document
          }
          const combined = mergeSnapshots(
            incoming,
            sending?.next ?? savedRef.current,
            latest.current
          )
          revision.current = result.project.revision
          savedRef.current = incoming
          latest.current = combined
          setSaved(incoming)
          setSnapshot(combined)
        }

        if (sending) {
          pending.current = null
          sequence.current = sending.sequence + 1
        }
        setStatus(changed && !canWrite ? 'error' : 'saved')

        return !changed || canWrite
      } catch (caught) {
        if (alive.current) {
          setConnection('offline')
          setPeers([])

          if (sending) {
            setError(caught instanceof Error ? caught.message : String(caught))
            setStatus('error')
          }

          const code =
            (caught as { status?: number; statusCode?: number }).status ??
            (caught as { statusCode?: number }).statusCode

          if (code === 403 || code === 404) setPermissionLost(true)
        }

        return false
      } finally {
        inFlight.current = null
      }
    })()
    inFlight.current = task

    return task
  }

  async function flush(): Promise<boolean> {
    do {
      if (!(await persist())) return false
    } while (
      alive.current &&
      JSON.stringify(latest.current) !== JSON.stringify(savedRef.current)
    )

    return alive.current
  }

  const leaveGuard = useRef(flush)

  leaveGuard.current = flush
  useEffect(
    () =>
      registerSignOutGuard(async () => {
        if (
          JSON.stringify(latest.current) !== JSON.stringify(savedRef.current) ||
          inFlight.current
        )
          if (!(await leaveGuard.current()))
            throw Error(t('errors.unsavedSignOut'))
      }),
    [t]
  )

  const synchronize = useRef(persist)

  synchronize.current = persist
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      const ok = await synchronize.current()

      if (!stopped)
        timer = setTimeout(
          () => {
            void tick()
          },
          ok ? 800 : 3000
        )
    }
    void tick()

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [])
  useEffect(() => {
    if (!readOnly) return
    setPreview(null)
    setTool('select')
    setConnectionStart(null)
  }, [readOnly])

  function choosePage(id: string) {
    setVectorEditing(null)
    setVectorNode(null)
    setCommentPin(null)
    setPageId(id)
    setSelected([])
    setPreview(null)
    setConnectionStart(null)
    setTool('select')
    setView({ x: 60, y: 60, zoom: 1 })
  }

  function addPage(mode: Mode, name: string) {
    if (snapshot.document.pages.length >= 40) {
      setError('pageLimit')

      return
    }

    const next = makePage(mode, name)
    commit({
      ...snapshot,
      document: {
        ...snapshot.document,
        pages: [...snapshot.document.pages, next]
      }
    })
    choosePage(next.id)
  }

  function switchMode(mode: Mode, name: string) {
    const next = snapshot.document.pages.find(p => p.mode === mode)

    if (next) choosePage(next.id)
    else if (!readOnly) addPage(mode, name)
  }

  function addElement(kind: Element['kind'], point: Point, name: string) {
    if (readOnly) return

    const next = makeElement(kind, point, name)
    updatePage({ ...page, elements: [...page.elements, next] })
    setSelected([next.id])
    setTool('select')
  }

  // File decoding can finish after the user edits, changes page or leaves the editor.
  function insertElement(targetPageId: string, element: Element) {
    if (!alive.current || access.current.readOnly) return

    const target = latest.current.document.pages.find(
      p => p.id === targetPageId
    )

    if (!target) return
    updatePage({ ...target, elements: [...target.elements, element] })
    if (access.current.pageId === targetPageId) setSelected([element.id])
  }

  function connect(id: string) {
    if (readOnly) return

    if (!connectionStart) setConnectionStart(id)
    else {
      updatePage(addConnection(page, connectionStart, id))
      setConnectionStart(null)
    }
  }

  function remove() {
    updatePage(removeElements(page, selected))
    setSelected([])
  }

  function duplicate() {
    const next = duplicateElements(page, selected)
    updatePage(next.page)
    setSelected(next.selected)
  }

  function group(ungroup = false) {
    changeElements(selected, { group: ungroup ? null : uid() })
  }

  function reorder(front: boolean) {
    const moving = page.elements.filter(
      e => selected.includes(e.id) && !e.locked
    )
    const rest = page.elements.filter(e => !moving.includes(e))
    updatePage({
      ...page,
      elements: front ? [...rest, ...moving] : [...moving, ...rest]
    })
  }

  function align(
    axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ) {
    const objects = page.elements.filter(
      e => selected.includes(e.id) && !e.locked
    )

    if (objects.length < 2) return

    const b = pageBounds(objects)
    updatePage({
      ...page,
      elements: page.elements.map(e =>
        !objects.includes(e)
          ? e
          : {
              ...e,
              ...(['left', 'center', 'right'].includes(axis)
                ? {
                    x:
                      axis === 'left'
                        ? b.x
                        : axis === 'right'
                          ? b.x + b.width - e.width
                          : b.x + (b.width - e.width) / 2
                  }
                : {
                    y:
                      axis === 'top'
                        ? b.y
                        : axis === 'bottom'
                          ? b.y + b.height - e.height
                          : b.y + (b.height - e.height) / 2
                  })
            }
      )
    })
  }

  function addBranch(name: string) {
    const parent = page.elements.find(e => e.id === selected[0])

    if (!parent || readOnly) return

    const siblings = page.connectors.filter(e => e.source === parent.id).length
    const child = makeElement(
      'node',
      { x: parent.x + parent.width + 140, y: parent.y + siblings * 140 },
      name
    )
    child.fill = parent.fill
    updatePage(
      addConnection(
        { ...page, elements: [...page.elements, child] },
        parent.id,
        child.id
      )
    )
    setSelected([child.id])
  }

  function createLayout() {
    const ids = descendants(page, selected)
    const objects = page.elements.filter(e => ids.has(e.id) && !e.locked)

    if (!objects.length) return

    const bounds = pageBounds(objects)
    const frame = {
      ...makeElement(
        'frame',
        { x: bounds.x - 16, y: bounds.y - 16 },
        t('layout.frame')
      ),
      layout: defaultLayout(),
      widthMode: 'hug' as const,
      heightMode: 'hug' as const
    }
    updatePage({
      ...page,
      elements: [...page.elements, frame].map(e =>
        ids.has(e.id) && (!e.parent || !ids.has(e.parent))
          ? { ...e, parent: frame.id }
          : e
      )
    })
    setSelected([frame.id])
  }

  function enableLayout(id: string) {
    const frame = page.elements.find(e => e.id === id)

    if (!frame || frame.kind !== 'frame') return
    updatePage({
      ...page,
      elements: page.elements.map(e =>
        e.id === id
          ? { ...e, layout: defaultLayout() }
          : !e.parent &&
              e.id !== id &&
              e.x >= frame.x &&
              e.y >= frame.y &&
              e.x + e.width <= frame.x + frame.width &&
              e.y + e.height <= frame.y + frame.height
            ? { ...e, parent: id }
            : e
      )
    })
  }

  function createComponent(name: string) {
    const definition = componentFromSelection(page, selected, name)

    if (!definition) return
    commit({
      ...latest.current,
      document: {
        ...latest.current.document,
        components: [...(latest.current.document.components ?? []), definition]
      }
    })
  }

  function insertComponent(id: string) {
    const definition = latest.current.document.components?.find(
      c => c.id === id
    )

    if (!definition) return

    const parts = instantiate(
      definition,
      (120 - view.x) / view.zoom,
      (120 - view.y) / view.zoom
    )
    updatePage({
      ...page,
      elements: [...page.elements, ...parts.elements],
      connectors: [...page.connectors, ...parts.connectors]
    })
    setSelected(parts.elements.map(e => e.id))
  }

  function updateComponent(instance: string) {
    const linked = page.elements.filter(e => e.component?.instance === instance)
    const definition = latest.current.document.components?.find(
      c => c.id === linked[0]?.component?.definition
    )

    if (!definition) return

    const included = descendants(
      page,
      linked.map(e => e.id)
    )
    const parts = page.elements.filter(e => included.has(e.id))
    const anchor =
      linked.find(e => !e.parent || !parts.some(p => p.id === e.parent)) ??
      linked[0]!
    const oldAnchor = definition.elements.find(
      e => e.id === anchor.component!.key
    )
    const x = anchor.x - (oldAnchor?.x ?? 0),
      y = anchor.y - (oldAnchor?.y ?? 0)
    const map = new Map(
      parts.map(e => [
        e.id,
        e.component?.instance === instance ? e.component.key : uid()
      ])
    )
    const elements = parts.map(e => {
      const item = {
        ...clone(e),
        id: map.get(e.id)!,
        x: e.x - x,
        y: e.y - y,
        parent: map.get(e.parent ?? '') ?? null,
        group: null
      }
      delete item.component

      return item
    })
    const connectors = page.connectors
      .filter(c => map.has(c.source) && map.has(c.target))
      .map(c => ({
        ...clone(c),
        id:
          definition.connectors.find(
            edge =>
              edge.source === map.get(c.source) &&
              edge.target === map.get(c.target)
          )?.id ?? uid(),
        source: map.get(c.source)!,
        target: map.get(c.target)!
      }))
    const working = clone(latest.current.document)

    for (const element of working.pages.find(p => p.id === page.id)!.elements)
      if (included.has(element.id))
        element.component = {
          definition: definition.id,
          instance,
          key: map.get(element.id)!,
          overrides:
            element.component?.instance === instance
              ? element.component.overrides
              : []
        }
    commit({
      ...latest.current,
      document: applyDefinition(
        working,
        { ...definition, elements, connectors },
        instance
      )
    })
  }

  function resetComponent(instance: string) {
    const definition = latest.current.document.components?.find(
      c =>
        c.id ===
        page.elements.find(e => e.component?.instance === instance)?.component
          ?.definition
    )

    if (definition)
      commit({
        ...latest.current,
        document: applyDefinition(latest.current.document, definition, instance)
      })
  }

  function detachComponent(instance: string) {
    updatePage({
      ...page,
      elements: page.elements.map(e => {
        if (e.component?.instance !== instance) return e

        const item = { ...e }
        delete item.component

        return item
      })
    })
  }

  function deleteComponent(id: string) {
    const document = clone(latest.current.document)
    document.components = document.components?.filter(c => c.id !== id)
    for (const p of document.pages)
      for (const e of p.elements)
        if (e.component?.definition === id) delete e.component
    commit({ ...latest.current, document })
  }

  return {
    projectId: project.id,
    comments: commentQuery.data ?? [],
    commentsError: commentQuery.isError,
    refreshComments: commentQuery.refetch,
    workspaceId: project.workspace_id,
    vectorEditing,
    setVectorEditing,
    vectorNode,
    setVectorNode,
    presenting,
    setPresenting,
    commentsOpen,
    setCommentsOpen,
    commentPin,
    setCommentPin,
    activeComment,
    setActiveComment,
    updateDocument: (document: Document) =>
      commit({ ...latest.current, document }),
    ...snapshot,
    title: snapshot.title,
    setTitle: (title: string) => commit({ ...latest.current, title }),
    page,
    renderedPage: preview ?? page,
    pageId: page.id,
    choosePage,
    addPage,
    switchMode,
    updatePage,
    changeElements,
    selected,
    setSelected,
    tool,
    setTool,
    view,
    setView,
    grid,
    setGrid,
    snap,
    setSnap,
    connectionStart,
    setConnectionStart,
    connect,
    preview,
    setPreview,
    addElement,
    insertElement,
    remove,
    duplicate,
    group,
    reorder,
    align,
    addBranch,
    autoLayout: () => updatePage(autoLayout(page)),
    createLayout,
    enableLayout,
    createComponent,
    insertComponent,
    updateComponent,
    resetComponent,
    detachComponent,
    deleteComponent,
    peers,
    connection,
    setCursor: (point: Point | null) => {
      cursor.current = point
    },
    canUndo: historyVersion >= 0 && past.current.length > 0,
    canRedo: future.current.length > 0,
    history,
    status,
    dirty,
    error,
    setError,
    persist,
    flush,
    readOnly,
    blocker,
    replace: (document: Document) => {
      commit({ ...snapshot, document: clone(document) })
      choosePage(document.pages[0]!.id)
    }
  }
}
type EditorState = ReturnType<typeof useEditorState>

const EditorContext = createContext<EditorState | null>(null)

export function EditorProvider({ children, ...props }: Props) {
  const value = useEditorState(props)

  return <EditorContext value={value}>{children}</EditorContext>
}

export function useEditor() {
  const value = useContext(EditorContext)

  if (!value) throw Error('Redraw editor is unavailable')

  return value
}
