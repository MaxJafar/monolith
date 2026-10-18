import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useBlocker } from 'react-router'

import { useAPIEndpoint, useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'

import {
  type FlowNode,
  type Graph,
  type Run,
  type Workflow,
  defaultConfig,
  payloadSchema,
  validateGraph
} from '../../shared'
import { workspaceAPI } from '../manifest'

function useAutomationState(initial: Workflow, readOnly: boolean) {
  const { t } = useModuleTranslation(),
    cache = useQueryClient(),
    endpoint = useAPIEndpoint(),
    { userData } = useAuth()
  const [saved, setSaved] = useState(initial),
    [draft, setDraft] = useState(initial)
  const [selected, setSelected] = useState('start'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [input, setInput] = useState('{}'),
    [result, setResult] = useState<Run | null>(null),
    [tab, setTab] = useState<'editor' | 'history'>('editor')
  const [undo, setUndo] = useState<Graph[]>([]),
    [redo, setRedo] = useState<Graph[]>([])
  const mounted = useRef(true),
    locked = useRef(false)
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({})
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(saved) ||
    Object.keys(fieldDrafts).length > 0
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  const blocker = useBlocker(dirty || busy)
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (!busy && window.confirm(t('discard'))) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker, busy, t])
  const historyOptions = workspaceAPI.flows.history
    .input({ workspace_id: initial.workspace_id, id: initial.id })
    .queryOptions({ refetchOnWindowFocus: false, enabled: tab === 'history' })
  const history = useQuery({
    ...historyOptions,
    queryKey: [...historyOptions.queryKey, endpoint, userData?.id]
  })
  function fieldDraft(key: string, value?: string) {
    if (readOnly || locked.current) return
    setFieldDrafts(previous => {
      const next = { ...previous }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }
  function change(changes: Partial<Workflow>) {
    if (!readOnly && !locked.current)
      setDraft(value => ({ ...value, ...changes }))
  }
  function graph(value: Graph) {
    if (readOnly || locked.current) return
    setUndo(history => [...history.slice(-39), draft.graph])
    setRedo([])
    change({ graph: value })
  }
  function updateNode(id: string, changes: Partial<FlowNode>) {
    graph({
      ...draft.graph,
      nodes: draft.graph.nodes.map(node =>
        node.id === id ? { ...node, ...changes } : node
      )
    })
  }
  function addNode(kind: FlowNode['kind']) {
    const id = crypto.randomUUID(),
      node: FlowNode = {
        id,
        kind,
        name: t(`nodes.${kind}`),
        x: 100 + (draft.graph.nodes.length % 4) * 260,
        y: 100 + Math.floor(draft.graph.nodes.length / 4) * 170,
        config: structuredClone(defaultConfig[kind])
      }
    graph({ ...draft.graph, nodes: [...draft.graph.nodes, node] })
    setSelected(id)
  }
  function removeNode(id: string) {
    if (
      readOnly ||
      locked.current ||
      draft.graph.nodes.find(n => n.id === id)?.kind === 'trigger'
    )
      return
    graph({
      ...draft.graph,
      nodes: draft.graph.nodes.filter(n => n.id !== id),
      edges: draft.graph.edges.filter(e => e.source !== id && e.target !== id)
    })
    setFieldDrafts(previous =>
      Object.fromEntries(
        Object.entries(previous).filter(([key]) => !key.startsWith(id + ':'))
      )
    )
    setSelected('')
  }
  function connect(
    source: string,
    target: string,
    port: 'main' | 'true' | 'false'
  ) {
    const next = {
      ...draft.graph,
      edges: [
        ...draft.graph.edges,
        { id: crypto.randomUUID(), source, target, port }
      ]
    }
    try {
      validateGraph(next)
      graph(next)
      setError('')
    } catch (cause) {
      setError(String(cause))
    }
  }
  function travel(direction: 'undo' | 'redo') {
    if (readOnly || locked.current) return
    const stack = direction === 'undo' ? undo : redo,
      next = stack.at(-1)
    if (!next) return
    if (direction === 'undo') {
      setUndo(stack.slice(0, -1))
      setRedo(h => [...h, draft.graph])
    } else {
      setRedo(stack.slice(0, -1))
      setUndo(h => [...h, draft.graph])
    }
    change({ graph: next })
  }
  async function task(action: () => Promise<void>) {
    if (locked.current || readOnly) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      locked.current = false
      if (mounted.current) setBusy(false)
    }
  }
  async function save() {
    await task(async () => {
      if (Object.keys(fieldDrafts).length) throw Error(t('applyFields'))
      validateGraph(draft.graph)
      const value = await workspaceAPI.flows.save
        .input({ workspace_id: draft.workspace_id, id: draft.id })
        .mutate({
          title: draft.title,
          description: draft.description,
          graph: draft.graph,
          interval_minutes: draft.interval_minutes,
          enabled: draft.enabled,
          expected_revision: saved.revision
        })
      if (!mounted.current) return
      setSaved(value)
      setDraft(value)
      void cache.invalidateQueries({ queryKey: workspaceAPI.flows.list.key })
    })
  }
  async function run() {
    if (dirty) {
      setError(t('saveFirst'))
      return
    }
    await task(async () => {
      const value = await workspaceAPI.flows.run
        .input({ workspace_id: saved.workspace_id, id: saved.id })
        .mutate({
          input: payloadSchema.parse(JSON.parse(input)),
          trigger: 'manual',
          expected_revision: saved.revision
        })
      if (!mounted.current) return
      setResult(value)
      void cache.invalidateQueries({ queryKey: workspaceAPI.flows.history.key })
    })
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              title: draft.title,
              description: draft.description,
              graph: draft.graph,
              interval_minutes: draft.interval_minutes
            },
            null,
            2
          )
        ],
        { type: 'application/json' }
      )
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${draft.title.replace(/[^a-z0-9-]/gi, '-') || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return {
    draft,
    saved,
    dirty,
    readOnly,
    selected,
    setSelected,
    error,
    setError,
    busy,
    input,
    setInput,
    result,
    setResult,
    tab,
    setTab,
    history,
    change,
    graph,
    updateNode,
    addNode,
    removeNode,
    connect,
    travel,
    canUndo: undo.length > 0,
    canRedo: redo.length > 0,
    save,
    run,
    download,
    fieldDrafts,
    fieldDraft
  }
}
const AutomationContext = createContext<ReturnType<
  typeof useAutomationState
> | null>(null)
export function AutomationProvider({
  initial,
  readOnly,
  children
}: {
  initial: Workflow
  readOnly: boolean
  children: ReactNode
}) {
  const state = useAutomationState(initial, readOnly)
  return <AutomationContext value={state}>{children}</AutomationContext>
}
export function useAutomation() {
  const state = useContext(AutomationContext)
  if (!state) throw Error('AutomationProvider is missing')
  return state
}
