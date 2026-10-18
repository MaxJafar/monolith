import { subscribeWorkspaceChanges, useAuth, useGateway } from '@monolith/api'
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { workspaceAPI } from '../manifest'
import {
  type Filters,
  type GraphNode,
  type Layers,
  emptyGraph,
  filterGraph,
  indexGraph,
  isPage,
  mergeKnowledge
} from './model'
import { searchAPI } from './searchAPI'

export type Workspace = { id: string; name: string; role: string }

function useAtlasState(workspace: Workspace) {
  const active = useRef(true)

  useEffect(() => {
    active.current = true

    return () => {
      active.current = false
    }
  }, [])

  const { userData } = useAuth()
  const { client: gateway } = useGateway()

  const navigate = useNavigate(),
    client = useQueryClient()

  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(''),
    deferredSearch = useDeferredValue(search)
  const [kind, setKind] = useState('all'),
    [context, setContext] = useState(''),
    [tag, setTag] = useState('')
  const [orphans, setOrphans] = useState(true),
    [sort, setSort] = useState('connections'),
    [depth, setDepth] = useState(1)
  const [layout, setLayout] = useState<'force' | 'radial'>('force'),
    [paused, setPaused] = useState(false)
  const [showLabels, setShowLabels] = useState(true),
    [spacing, setSpacing] = useState(180)
  const [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(0)
  const [layers, setLayers] = useState<Layers>({
    tags: true,
    topics: false,
    context: true,
    strength: 0.45,
    colors: 'type'
  })

  const [edgeFocus, setEdgeFocus] = useState('')
  const [ragOpen, setRagOpen] = useState(false)
  const [ragQuery, setRagQuery] = useState('')

  const options = workspaceAPI.snapshot
    .input({ workspace_id: workspace.id })
    .queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 15000
    })
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id]
  })
  const mapOptions = searchAPI.map
    .input({ workspace_id: workspace.id })
    .queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 30000
    })
  const contextQuery = useQuery({
    ...mapOptions,
    queryKey: [...mapOptions.queryKey, userData?.id],
    retry: false,
    enabled: !!query.data
  })
  useEffect(() => {
    if (!gateway) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = subscribeWorkspaceChanges(
      { ...gateway.identity, workspaceId: workspace.id },
      () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          void client.invalidateQueries({ queryKey: workspaceAPI.snapshot.key })
          void client.invalidateQueries({ queryKey: workspaceAPI.preview.key })
          void client.invalidateQueries({ queryKey: searchAPI.map.key })
        }, 150)
      }
    )
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [gateway, client, workspace.id])
  const online = useSyncExternalStore(
    listener => onlineManager.subscribe(listener),
    () => onlineManager.isOnline()
  )
  const graph = useMemo(
    () => mergeKnowledge(query.data ?? emptyGraph, contextQuery.data, layers),
    [query.data, contextQuery.data, layers]
  )

  const index = useMemo(() => indexGraph(graph), [graph])

  const focus = params.get('focus') ?? '',
    scope = params.get('scope') === 'local' ? 'local' : 'global'
  const selected = index.nodes.get(focus)
  const filters: Filters = {
    search: deferredSearch,
    kind,
    context,
    tag,
    orphans,
    sort,
    scope,
    focus,
    depth
  }
  const graphFocus = scope === 'local' || graph.nodes.length > 600 ? focus : ''
  const visible = useMemo(
    () =>
      filterGraph(graph, index, {
        search: deferredSearch,
        kind,
        context,
        tag,
        orphans,
        sort,
        scope,
        focus: graphFocus,
        depth
      }),
    [
      graph,
      index,
      deferredSearch,
      kind,
      context,
      tag,
      orphans,
      sort,
      scope,
      graphFocus,
      depth
    ]
  )
  const contexts = useMemo(
    () =>
      [
        ...new Set(
          graph.nodes
            .map(node => node.context)
            .filter((value): value is string => !!value)
        )
      ].sort(),
    [graph.nodes]
  )
  const tags = useMemo(
    () => [...new Set(graph.nodes.flatMap(node => node.tags ?? []))].sort(),
    [graph.nodes]
  )
  const readOnly =
    !['owner', 'editor'].includes(workspace.role) || !online || !!query.error

  function select(key: string, scope?: 'local' | 'global') {
    setEdgeFocus('')
    setParams(
      previous => {
        const next = new URLSearchParams(previous)
        next.set('workspace', workspace.id)
        if (key) next.set('focus', key)
        else {
          next.delete('focus')
          next.delete('scope')
        }
        if (scope) next.set('scope', scope)

        return next
      },
      { replace: true }
    )
  }

  function selectEdge(id: string) {
    const edge = graph.edges.find(edge => edge.id === id)

    if (!edge) return
    select(edge.source)
    setEdgeFocus(id)
  }

  function searchContext(value: string) {
    setRagQuery(value)
    setRagOpen(true)
  }

  function setScope(value: string) {
    setParams(
      previous => {
        const next = new URLSearchParams(previous)
        next.set('scope', value)

        return next
      },
      { replace: true }
    )
  }

  function clearFilters() {
    setSearch('')
    setKind('all')
    setContext('')
    setTag('')
    setOrphans(true)
  }

  function resetFilters() {
    clearFilters()
    setScope('global')
  }

  function explore(key: string) {
    clearFilters()
    select(key, 'local')
  }

  async function run(action: () => Promise<unknown>, refresh = true) {
    setPending(count => count + 1)
    setError(null)

    try {
      await action()
      if (!active.current) return false
      if (refresh)
        await Promise.all([
          client.invalidateQueries({ queryKey: workspaceAPI.snapshot.key }),
          client.invalidateQueries({ queryKey: searchAPI.map.key })
        ])

      return true
    } catch (caught) {
      if (active.current)
        setError(caught instanceof Error ? caught.message : String(caught))

      return false
    } finally {
      if (active.current) setPending(count => count - 1)
    }
  }

  function open(node: GraphNode) {
    if (node.kind === 'redraw') {
      navigate(`/redraw/${node.id}?workspace=${workspace.id}`)
      return
    }
    if (!isPage(node)) {
      if (
        (node.kind === 'source' || node.kind === 'database') &&
        node.href?.startsWith('/') &&
        !node.href.startsWith('//')
      )
        navigate(node.href)
      else explore(node.key)

      return
    }

    if (node.kind === 'document') {
      navigate(`/page/${node.id}?workspace=${workspace.id}`)

      return
    }
    if (node.kind === 'record')
      void run(async () => {
        const page = await workspaceAPI.preview
          .input({ workspace_id: workspace.id, kind: 'record', id: node.id })
          .query()

        if (active.current) navigate(page.href)
      }, false)
  }

  async function createPage(title: string) {
    if (readOnly) return false

    return run(async () => {
      const page = await workspaceAPI.createPage
        .input({ workspace_id: workspace.id })
        .mutate({ title: title.trim(), parent_id: null })
      // Native navigation also owns a page list; refresh its registered query.
      await client.invalidateQueries()
      if (active.current) navigate(`/page/${page.id}?workspace=${workspace.id}`)
    })
  }

  return {
    workspace,
    userId: userData?.id,
    graph,
    contextQuery,
    layers,
    setLayers,
    edgeFocus,
    selectEdge,
    ragOpen,
    setRagOpen,
    ragQuery,
    setRagQuery,
    searchContext,
    index,
    query,
    visible,
    selected,
    focus,
    scope,
    select,
    explore,
    setScope,
    filters,
    search,
    setSearch,
    setKind,
    setContext,
    setTag,
    setOrphans,
    setSort,
    setDepth,
    resetFilters,
    contexts,
    tags,
    layout,
    setLayout,
    paused,
    setPaused,
    showLabels,
    setShowLabels,
    spacing,
    setSpacing,
    readOnly,
    online,
    busy: pending > 0,
    error,
    setError,
    run,
    open,
    createPage
  }
}

const AtlasContext = createContext<ReturnType<typeof useAtlasState> | null>(
  null
)

export function AtlasProvider({
  workspace,
  children
}: {
  workspace: Workspace
  children: ReactNode
}) {
  const value = useAtlasState(workspace)

  return <AtlasContext value={value}>{children}</AtlasContext>
}

export function useAtlas() {
  const value = useContext(AtlasContext)

  if (!value) throw new Error('AtlasProvider is required')

  return value
}
