import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  Stack,
  Text,
  WorkspaceCanvas,
  getInternalDragData,
  hasInternalDragData,
  useCanvasWidgets
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'
import {
  agendaMatches,
  systemStatus,
  withSystemDates
} from '@/utils/systemViews'

import {
  type CalendarOccurrence,
  expandCalendarRecord
} from '../../../../calendarShared'
import type { RecordPage } from '../../../../shared'
import { ProjectTimeline } from '../ProjectTimeline'
import { RecordEditor } from '../RecordEditor'
import { useCalendarSchedules } from '../calendar/useCalendarSchedules'
import { ProjectCard } from './ProjectCard'
import { WorkCreatePopover } from './WorkCreatePopover'
import './workHub.css'

type Action = RecordPage & { occurrence?: CalendarOccurrence }

export function WorkHub({ area }: { area: 'projects' | 'actions' }) {
  const { record, closeRecord } = useDatabases()
  const { t } = useTranslation('common.workHub')
  const { pageStorage } = useCanvasWidgets()

  const storage = pageStorage?.('/actions')

  if (record)
    return (
      <RecordEditor
        key={record.id}
        record={record}
        returnLabel={t(area)}
        onDone={closeRecord}
      />
    )

  const body = <WorkHubBody area={area} />

  return area === 'actions' ? (
    <WorkspaceCanvas
      native={body}
      storage={storage ? { ...storage, title: t('actions') } : undefined}
      title={t('actions')}
      widgetScope="actions"
    />
  ) : (
    body
  )
}

function WorkHubBody({ area }: { area: 'projects' | 'actions' }) {
  const {
    data,
    api,
    run,
    readOnly,
    busy,
    loading,
    error,
    retry,
    openRecord,
    workspaceId
  } = useDatabases()

  const { t } = useTranslation('common.workHub')
  const schedules = useCalendarSchedules(area === 'actions')
  const [query, setQuery] = useState('')
  const [table, setTable] = useState('')
  const [project, setProject] = useState('')
  const [filter, setFilter] = useState('inbox')
  const [layout, setLayout] = useState('gallery')

  const [creating, setCreating] = useState<{
    anchor: HTMLElement
    kind: 'action' | 'project'
    projectId?: string
  } | null>(null)
  const projects = data.records.filter(row => row.item_type === 'project')
  const actions = useMemo<Action[]>(
    () =>
      data.records
        .filter(row => row.item_type === 'task')
        .flatMap(row => {
          const schedule = schedules.data?.schedules.find(
            item => item.record_id === row.id && item.settings.recurrence
          )

          if (!schedule) return [withSystemDates(row, data.fields)]

          return expandCalendarRecord(
            row,
            dayjs().subtract(30, 'day').startOf('day').toISOString(),
            dayjs().add(90, 'day').toISOString(),
            data.fields,
            schedule
          ).map(occurrence => ({
            ...row,
            date: occurrence.start,
            end_date: occurrence.end,
            done: occurrence.done,
            status: occurrence.done ? ('done' as const) : ('planned' as const),
            occurrence
          }))
        }),
    [data.records, data.fields, schedules.data]
  )
  const scopedActions = actions.filter(
    row =>
      (!project || row.project_id === project) &&
      (!table || row.base_id === table) &&
      row.title.toLowerCase().includes(query.toLowerCase())
  )
  const items = (
    area === 'projects'
      ? projects.filter(row => !table || row.base_id === table)
      : scopedActions.filter(row => agendaMatches(row, filter))
  )
    .filter(row => row.title.toLowerCase().includes(query.toLowerCase()))
    .sort(
      (a, b) =>
        (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
        a.title.localeCompare(b.title)
    )
  const projectNames = new Map(projects.map(row => [row.id, row.title]))

  async function toggle(action: Action, done: boolean) {
    if (readOnly || busy || schedules.isFetching || schedules.error) return
    if (action.occurrence && workspaceId) {
      await run(() =>
        workspaceAPI.calendar.occurrence
          .input({ workspace_id: workspaceId, record_id: action.id })
          .mutate({
            expected_revision: action.occurrence!.schedule!.revision,
            original: action.occurrence!.original,
            change: { done }
          })
      )
    } else
      await run(() =>
        api.updateRecord.input({ id: action.id }).mutate({
          expected_updated: action.updated,
          done,
          status: done ? 'done' : 'planned'
        })
      )
  }
  if (loading) return <Text role="status">{t('loading')}</Text>

  return (
    <Stack className="work-hub" gap="lg">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack flex="1" gap="xs" minWidth="220px" width="auto">
          {area === 'projects' && (
            <Text as="h1" className="work-heading">
              {t('projects')}
            </Text>
          )}
          <Text color="muted" size="sm">
            {t(`${area}Subtitle`)}
          </Text>
        </Stack>
        <Button
          disabled={readOnly || busy}
          icon="lucide:plus"
          namespace={false}
          onClick={event =>
            setCreating({
              anchor: event.currentTarget,
              kind: area === 'projects' ? 'project' : 'action',
              projectId: project
            })
          }
        >
          {t(area === 'projects' ? 'newProject' : 'newAction')}
        </Button>
      </Flex>
      {(error || (area === 'actions' && schedules.error)) && (
        <Flex gap="sm" role="alert">
          <Text>{error || t('loadFailed')}</Text>
          <Button
            namespace={false}
            onClick={() => {
              retry()
              void schedules.refetch()
            }}
          >
            {t('retry')}
          </Button>
        </Flex>
      )}
      {area === 'actions' && (
        <Flex
          aria-label={t('actions')}
          className="work-tabs"
          gap="xs"
          role="tablist"
          wrap="wrap"
        >
          {['inbox', 'today', 'agenda', 'all', 'done'].map(value => (
            <Box
              key={value}
              aria-selected={filter === value}
              as="button"
              role="tab"
              type="button"
              onClick={() => setFilter(value)}
            >
              {t(`filters.${value}`)}
              <Text as="span" size="xs">
                {scopedActions.filter(row => agendaMatches(row, value)).length}
              </Text>
            </Box>
          ))}
        </Flex>
      )}
      <Flex align="center" className="work-toolbar" gap="sm" wrap="wrap">
        <Flex align="center" className="work-search" gap="sm">
          <Icon icon="lucide:search" size="15px" />
          <Box
            aria-label={t('search')}
            as="input"
            placeholder={t('search')}
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </Flex>
        <Box width="190px">
          <ChoiceSelect
            label={t('table')}
            options={[
              { value: '', label: t('allTables') },
              ...data.bases
                .filter(
                  base =>
                    base.table_type ===
                      (area === 'projects' ? 'project' : 'action') ||
                    data.records.some(
                      row =>
                        row.base_id === base.id &&
                        row.item_type ===
                          (area === 'projects' ? 'project' : 'task')
                    )
                )
                .map(base => ({ value: base.id, label: base.name }))
            ]}
            value={table}
            onChange={setTable}
          />
        </Box>
        {area === 'actions' && (
          <Box width="190px">
            <ChoiceSelect
              label={t('project')}
              options={[
                { value: '', label: t('allProjects') },
                ...projects.map(row => ({ value: row.id, label: row.title }))
              ]}
              value={project}
              onChange={value => {
                setProject(value)
                if (value) setFilter('all')
              }}
            />
          </Box>
        )}
        {area === 'projects' && (
          <Flex className="work-layouts" gap="xs">
            {['gallery', 'board', 'list', 'timeline', 'gantt'].map(value => (
              <Button
                key={value}
                aria-pressed={layout === value}
                namespace={false}
                variant={layout === value ? 'secondary' : 'plain'}
                onClick={() => setLayout(value)}
              >
                {t(`layouts.${value}`)}
              </Button>
            ))}
          </Flex>
        )}
      </Flex>
      {area === 'projects' ? (
        ['timeline', 'gantt'].includes(layout) ? (
          <ProjectTimeline gantt={layout === 'gantt'} items={items} />
        ) : layout === 'board' ? (
          <Box className="work-board">
            {['planned', 'active', 'done'].map(status => (
              <Stack
                key={status}
                gap="md"
                onDragOver={event => {
                  if (
                    !readOnly &&
                    !busy &&
                    hasInternalDragData(
                      event.nativeEvent,
                      'application/x-monolith-project'
                    )
                  )
                    event.preventDefault()
                }}
                onDrop={event => {
                  event.preventDefault()
                  if (readOnly || busy) return

                  const item = projects.find(
                    row =>
                      row.id ===
                      getInternalDragData(
                        event.nativeEvent,
                        'application/x-monolith-project'
                      )
                  )

                  if (item)
                    void run(() =>
                      api.updateRecord.input({ id: item.id }).mutate({
                        expected_updated: item.updated,
                        status: status as 'planned' | 'active' | 'done',
                        done: status === 'done'
                      })
                    )
                }}
              >
                <Text color="muted" size="sm">
                  {t(`statuses.${status}`)} ·{' '}
                  {items.filter(row => systemStatus(row) === status).length}
                </Text>
                {items
                  .filter(row => systemStatus(row) === status)
                  .map(row => (
                    <ProjectCard
                      key={row.id}
                      project={row}
                      onAdd={anchor =>
                        setCreating({
                          anchor,
                          kind: 'action',
                          projectId: row.id
                        })
                      }
                    />
                  ))}
              </Stack>
            ))}
          </Box>
        ) : (
          <Box
            className={layout === 'list' ? 'work-project-list' : 'work-gallery'}
          >
            {items.map(row => (
              <ProjectCard
                key={row.id}
                project={row}
                onAdd={anchor =>
                  setCreating({ anchor, kind: 'action', projectId: row.id })
                }
              />
            ))}
          </Box>
        )
      ) : (
        <Stack gap="xs">
          {(items as Action[]).map((row, index) => (
            <Box key={row.occurrence?.id ?? row.id}>
              {filter === 'agenda' &&
                (index === 0 ||
                  dayjs(items[index - 1]?.date).format('YYYY-MM-DD') !==
                    dayjs(row.date).format('YYYY-MM-DD')) && (
                  <Text className="work-agenda-day" size="sm" weight="semibold">
                    {row.date
                      ? dayjs(row.date).format('dddd, MMM D')
                      : t('noDueDate')}
                  </Text>
                )}
              <Flex
                align="center"
                className="work-action-row"
                data-done={systemStatus(row) === 'done'}
                gap="md"
              >
                <Box
                  aria-label={t('complete', { name: row.title })}
                  as="input"
                  checked={systemStatus(row) === 'done'}
                  disabled={
                    readOnly ||
                    busy ||
                    schedules.isFetching ||
                    !!schedules.error
                  }
                  type="checkbox"
                  onChange={event => {
                    void toggle(row, event.target.checked)
                  }}
                />
                <Box
                  as="button"
                  className="work-title-link"
                  onClick={() => openRecord(row)}
                >
                  {row.title}
                </Box>
                <Text color="muted" size="xs">
                  {projectNames.get(row.project_id ?? '') ?? t('noProject')}
                </Text>
                <Text color="muted" size="xs">
                  {row.date ? dayjs(row.date).format('MMM D') : ''}
                </Text>
                <Text
                  className="work-priority"
                  data-priority={row.priority}
                  size="xs"
                >
                  {t(`priorities.${row.priority ?? 'normal'}`)}
                </Text>
              </Flex>
            </Box>
          ))}
        </Stack>
      )}
      {!items.length && (
        <Stack align="center" className="work-empty" gap="sm">
          <Icon
            icon={area === 'projects' ? 'lucide:layers-2' : 'lucide:inbox'}
            size="28px"
          />
          <Text weight="semibold">{t('empty')}</Text>
          <Text color="muted" size="sm">
            {t('emptyHelp')}
          </Text>
        </Stack>
      )}
      {creating && (
        <WorkCreatePopover
          {...creating}
          onClose={() => setCreating(null)}
          onCreated={row => {
            setQuery('')
            setTable('')

            if (area === 'actions') {
              setProject(row.project_id ?? '')
              setFilter(row.project_id || row.date ? 'all' : 'inbox')
            }
          }}
        />
      )}
    </Stack>
  )
}
