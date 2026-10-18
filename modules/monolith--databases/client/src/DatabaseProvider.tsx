import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseAsString, useQueryStates } from 'nuqs'
import { type ReactNode, useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'
import type { KnowledgeSnapshot, PageTarget } from '@monolith/blocks'
import { useModuleTranslation } from '@monolith/localization'

import { databaseAPI } from '@/databaseAPI'
import { workspaceAPI } from '@/manifest'
import { recordNavigation, viewNavigation } from '@/utils/navigation'
import {
  type KnowledgeIndex,
  type SnapshotIndex,
  indexKnowledge,
  indexSnapshot
} from '@/utils/snapshotIndex'

import {
  type Base,
  type CellValue,
  type Field,
  type Person,
  type RecordPage,
  type Snapshot,
  displayValue
} from '../../shared'
import { DatabaseContext } from './DatabaseContext'

const emptySnapshot: Snapshot = {
  bases: [],
  fields: [],
  records: [],
  views: [],
  links: []
}

const emptyKnowledge: KnowledgeSnapshot = {
  nodes: [],
  edges: [],
  unresolved: 0
}
const emptyPeople: Person[] = []

export type DatabaseContextValue = {
  workspaceId?: string
  api: typeof workspaceAPI
  readOnly: boolean
  stale: boolean
  embedded: boolean
  data: Snapshot
  index: SnapshotIndex
  base: Base | undefined
  record: RecordPage | undefined
  selectedViewId: string
  selectView: (id: string) => void
  selectBase: (id: string) => void
  openRecord: (record: Pick<RecordPage, 'id' | 'base_id'>) => void
  recordHref: (record: Pick<RecordPage, 'id' | 'base_id'>) => string
  viewHref: (id: string) => string
  closeRecord: () => void
  run: <T>(action: () => Promise<T>) => Promise<T | undefined>
  busy: boolean
  error: string | null
  loading: boolean
  retry: () => void
  knowledge: KnowledgeSnapshot
  knowledgeIndex: KnowledgeIndex
  knowledgeLoading: boolean
  openPage: (page: Pick<PageTarget, 'kind' | 'id'>) => void
  people: Person[]
  peopleLoading: boolean
  propertyLabel: (field: Field, value: CellValue | undefined) => string
}

export { useDatabases } from './DatabaseContext'

export function DatabaseProvider({
  children,
  workspaceId,
  baseId,
  viewId,
  onViewChange
}: {
  children: ReactNode
  workspaceId?: string
  baseId?: string
  viewId?: string
  onViewChange?: (id: string) => void
}) {
  const { t } = useModuleTranslation()
  const { userData } = useAuth()
  const [params, setParams] = useSearchParams()

  const workspaceOptions = workspaceAPI.workspaces.list.queryOptions()
  const workspaces = useQuery({
    ...workspaceOptions,
    queryKey: [...workspaceOptions.queryKey, userData?.id],
    enabled: !!userData?.id
  })
  const workspace =
    workspaceId ??
    params.get('workspace') ??
    workspaces.data?.find(item => item.is_default)?.id ??
    workspaces.data?.[0]?.id
  const api = useMemo(() => databaseAPI(workspace), [workspace])
  const activeWorkspace = workspaces.data?.find(item => item.id === workspace)
  const roleReadOnly =
    activeWorkspace?.role !== 'owner' && activeWorkspace?.role !== 'editor'

  const peopleQuery = useQuery({
    ...api.people.queryOptions({ staleTime: 0, refetchOnWindowFocus: true }),
    queryKey: [...api.people.queryOptions().queryKey, userData?.id],
    enabled: !!workspace
  })
  const query = useQuery({
    ...api.snapshot.queryOptions({ staleTime: 0, refetchOnWindowFocus: true }),
    queryKey: [...api.snapshot.queryOptions().queryKey, userData?.id],
    enabled: !!workspace
  })
  const online = useSyncExternalStore(
    listener => onlineManager.subscribe(listener),
    () => onlineManager.isOnline()
  )
  const stale = !online || !!query.error
  const readOnly = roleReadOnly || stale
  const graph = useQuery({
    ...api.knowledge.snapshot.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    }),
    queryKey: [...api.knowledge.snapshot.queryOptions().queryKey, userData?.id],
    enabled: !!workspace
  })

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [calendarParams] = useQueryStates({
    calendarDate: parseAsString,
    calendarLayout: parseAsString,
    calendarField: parseAsString
  })

  const [inlineView, setInlineView] = useState({
    baseId,
    source: viewId,
    id: viewId ?? ''
  })
  const [inlineRecord, setInlineRecord] = useState('')
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const data: Snapshot = query.data ?? emptySnapshot

  const index = useMemo(() => indexSnapshot(data), [data])

  const knowledge = graph.data ?? emptyKnowledge

  const knowledgeIndex = useMemo(() => indexKnowledge(knowledge), [knowledge])

  const people = peopleQuery.data ?? emptyPeople
  const peopleById = useMemo(
    () => new Map(people.map(person => [person.id, person])),
    [people]
  )
  const calendarNavigation = {
    ...(calendarParams.calendarDate
      ? { calendarDate: calendarParams.calendarDate }
      : {}),
    ...(calendarParams.calendarLayout
      ? { calendarLayout: calendarParams.calendarLayout }
      : {}),
    ...(calendarParams.calendarField
      ? { calendarField: calendarParams.calendarField }
      : {})
  }
  const base =
    index.basesById.get(baseId ?? params.get('base') ?? '') ??
    (baseId ? undefined : data.bases[0])
  const selectedRecord = index.recordsById.get(
    baseId ? inlineRecord : (params.get('record') ?? '')
  )
  const record =
    selectedRecord?.base_id === base?.id ? selectedRecord : undefined
  const selectedViewId = baseId
    ? inlineView.baseId === baseId && inlineView.source === viewId
      ? inlineView.id
      : (viewId ?? '')
    : (params.get('view') ?? '')

  function propertyLabel(field: Field, value: CellValue | undefined): string {
    if (
      ['person', 'created-by', 'last-edited-by'].includes(field.kind) &&
      typeof value === 'string' &&
      value
    ) {
      return peopleById.get(value)?.label ?? t('unknownOwner')
    }

    return displayValue(value)
  }

  function selectBase(id: string) {
    setParams({ base: id, ...(workspace ? { workspace } : {}) })
  }

  function selectView(id: string) {
    if (baseId) {
      setInlineView({ baseId, source: viewId, id })
      if (!readOnly) onViewChange?.(id)
      return
    }
    setParams({
      ...Object.fromEntries(
        viewNavigation(base?.id ?? '', id, calendarNavigation)
      ),
      ...(workspace ? { workspace } : {})
    })
  }

  function openRecord(record: Pick<RecordPage, 'id' | 'base_id'>) {
    if (baseId && record.base_id === baseId) {
      setInlineRecord(record.id)
      return
    }
    if (baseId)
      navigate(
        `/databases?${recordNavigation(record, base?.id, selectedViewId, calendarNavigation)}${workspace ? `&workspace=${workspace}` : ''}`
      )
    else
      setParams({
        ...Object.fromEntries(
          recordNavigation(record, base?.id, selectedViewId, calendarNavigation)
        ),
        ...(workspace ? { workspace } : {})
      })
  }

  function closeRecord() {
    if (baseId) {
      setInlineRecord('')
      return
    }
    setParams({
      base: base?.id ?? '',
      view: selectedViewId,
      ...calendarNavigation,
      ...(workspace ? { workspace } : {})
    })
  }

  function openPage(page: Pick<PageTarget, 'kind' | 'id'>) {
    if (page.kind === 'redraw') {
      navigate(
        `/redraw/${page.id}${workspace ? `?workspace=${workspace}` : ''}`
      )
      return
    }
    if (page.kind === 'document') {
      if (workspace) navigate(`/page/${page.id}?workspace=${workspace}`)
      else setParams({ section: 'documents', document: page.id })
    } else if (page.kind === 'note') navigate(`/notes?entry=${page.id}`)
    else {
      const target = index.recordsById.get(page.id)

      if (target) openRecord(target)
      else setError('Linked page is unavailable')
    }
  }

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (readOnly) {
      setError(t('workspaceReadOnly'))

      return undefined
    }
    setPending(count => count + 1)
    setError(null)

    try {
      const result = await action()
      await queryClient.invalidateQueries({ queryKey: workspaceAPI.key })

      return result
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))

      return undefined
    } finally {
      setPending(count => count - 1)
    }
  }

  return (
    <DatabaseContext
      value={{
        workspaceId: workspace,
        api,
        readOnly,
        stale,
        embedded: !!baseId,
        data,
        index,
        base,
        record,
        selectedViewId,
        selectView,
        selectBase,
        openRecord,
        recordHref: record =>
          `${baseId ? '/databases' : ''}?${recordNavigation(record, base?.id, selectedViewId, calendarNavigation)}${workspace ? `&workspace=${workspace}` : ''}`,
        viewHref: id =>
          `${baseId ? '/databases' : ''}?${viewNavigation(base?.id ?? '', id, calendarNavigation)}${workspace ? `&workspace=${workspace}` : ''}`,
        closeRecord,
        run,
        knowledge,
        knowledgeIndex,
        knowledgeLoading: graph.isLoading,
        openPage,
        people,
        peopleLoading: peopleQuery.isLoading,
        propertyLabel,
        busy: pending > 0,
        error:
          error ??
          workspaces.error?.message ??
          query.error?.message ??
          graph.error?.message ??
          peopleQuery.error?.message ??
          null,
        loading: workspaces.isLoading || query.isLoading,
        retry: () => {
          setError(null)
          void query.refetch()
          void graph.refetch()
          void peopleQuery.refetch()
        }
      }}
    >
      {children}
    </DatabaseContext>
  )
}
