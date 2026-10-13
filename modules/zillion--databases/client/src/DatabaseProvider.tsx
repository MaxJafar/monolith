import { useQuery, useQueryClient } from '@tanstack/react-query'
import { parseAsString, useQueryStates } from 'nuqs'
import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '@lifeforge/api'
import type { KnowledgeSnapshot, PageTarget } from '@lifeforge/blocks'
import { useModuleTranslation } from '@lifeforge/localization'

import { databaseAPI } from '@/databaseAPI'
import { forgeAPI } from '@/manifest'
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
  api: typeof forgeAPI
  readOnly: boolean
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
  viewId
}: {
  children: ReactNode
  workspaceId?: string
  baseId?: string
  viewId?: string
}) {
  const { t } = useModuleTranslation()
  const { userData } = useAuth()
  const [params, setParams] = useSearchParams()

  const workspace = workspaceId ?? params.get('workspace') ?? undefined

  const api = useMemo(() => databaseAPI(workspace), [workspace])

  const workspaceOptions = forgeAPI.workspaces.list.queryOptions()
  const workspaces = useQuery({
    ...workspaceOptions,
    queryKey: [...workspaceOptions.queryKey, userData?.id],
    enabled: !!workspace
  })
  const activeWorkspace = workspaces.data?.find(item => item.id === workspace)
  const readOnly =
    !!workspace &&
    activeWorkspace?.role !== 'owner' &&
    activeWorkspace?.role !== 'editor'

  const peopleQuery = useQuery({
    ...api.people.queryOptions({ staleTime: 0, refetchOnWindowFocus: true }),
    queryKey: [...api.people.queryOptions().queryKey, userData?.id]
  })
  const query = useQuery({
    ...api.snapshot.queryOptions({ staleTime: 0, refetchOnWindowFocus: true }),
    queryKey: [...api.snapshot.queryOptions().queryKey, userData?.id]
  })
  const graph = useQuery({
    ...api.knowledge.snapshot.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    }),
    queryKey: [...api.knowledge.snapshot.queryOptions().queryKey, userData?.id]
  })

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [calendarParams] = useQueryStates({
    calendarDate: parseAsString,
    calendarLayout: parseAsString
  })

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
      : {})
  }
  const base =
    index.basesById.get(baseId ?? params.get('base') ?? '') ??
    (baseId ? undefined : data.bases[0])
  const selectedRecord = index.recordsById.get(params.get('record') ?? '')
  const record =
    selectedRecord?.base_id === base?.id ? selectedRecord : undefined
  const selectedViewId = viewId ?? params.get('view') ?? ''

  function propertyLabel(field: Field, value: CellValue | undefined): string {
    if (field.kind === 'person' && typeof value === 'string' && value) {
      return peopleById.get(value)?.label ?? t('unknownOwner')
    }

    return displayValue(value)
  }

  function selectBase(id: string) {
    setParams({ base: id, ...(workspace ? { workspace } : {}) })
  }

  function selectView(id: string) {
    setParams({
      ...Object.fromEntries(
        viewNavigation(base?.id ?? '', id, calendarNavigation)
      ),
      ...(workspace ? { workspace } : {})
    })
  }

  function openRecord(record: Pick<RecordPage, 'id' | 'base_id'>) {
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
    setParams({
      base: base?.id ?? '',
      view: selectedViewId,
      ...calendarNavigation,
      ...(workspace ? { workspace } : {})
    })
  }

  function openPage(page: Pick<PageTarget, 'kind' | 'id'>) {
    if (page.kind === 'document') {
      if (workspace) navigate(`/page/${page.id}`)
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
      await queryClient.invalidateQueries({ queryKey: forgeAPI.key })

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
        api,
        readOnly,
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
          query.error?.message ??
          graph.error?.message ??
          peopleQuery.error?.message ??
          null,
        loading: query.isLoading,
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
