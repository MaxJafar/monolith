import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import {
  Box,
  Button,
  Card,
  ChoiceSelect,
  Flex,
  Grid,
  HorizontalBarChart,
  Icon,
  ProgressRing,
  Stack,
  Text,
  WorkspaceCanvas,
  elasticDragPreview,
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData,
  useCanvasWidgets
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'
import {
  agendaMatches,
  belongsToSystem,
  systemStatus,
  withSystemDates
} from '@/utils/systemViews'

import {
  type CalendarOccurrence,
  expandCalendarRecord
} from '../../../calendarShared'
import { type RecordPage, viewConfigSchema } from '../../../shared'
import type { ItemType } from '../../../workspaceShared'
import { DatabaseCalendar } from './DatabaseCalendar'
import { JournalActivity } from './JournalActivity'
import { ProjectTimeline } from './ProjectTimeline'
import { RecordEditor } from './RecordEditor'
import { useCalendarSchedules } from './calendar/useCalendarSchedules'
import './systemWorkspace.css'

export function SystemWorkspace({ area }: { area: string }) {
  const {
    data,
    record,
    closeRecord,
    loading,
    error,
    retry,
    stale,
    readOnly,
    busy,
    run,
    api,
    openRecord,
    workspaceId
  } = useDatabases()

  const { t } = useTranslation('common.systemViews')
  const [params] = useSearchParams()
  const schedules = useCalendarSchedules(area === 'actions')

  const [filter, setFilter] = useState('today'),
    [query, setQuery] = useState(''),
    [database, setDatabase] = useState(''),
    [layout, setLayout] = useState(area === 'projects' ? 'board' : 'list')
  const [creating, setCreating] = useState(false),
    [title, setTitle] = useState(''),
    [date, setDate] = useState(
      ['actions', 'calendar', 'journal'].includes(area)
        ? dayjs().format(
            area === 'calendar' ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD'
          )
        : ''
    ),
    [targetDatabase, setTargetDatabase] = useState(''),
    [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>(
      'normal'
    )

  const [tab, setTab] = useState('docs')
  const [eventEnd, setEventEnd] = useState(
    dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm')
  )

  const selectedArea = area === 'docs' ? tab : area
  const kind: ItemType =
    (
      {
        actions: 'task',
        projects: 'project',
        docs: 'note',
        journal: 'note',
        calendar: 'event'
      } as Record<string, ItemType>
    )[selectedArea] ?? 'page'
  const all = useMemo(
    () =>
      data.records
        .map(item =>
          selectedArea === 'calendar'
            ? item
            : withSystemDates(item, data.fields)
        )
        .filter(item =>
          belongsToSystem(
            selectedArea === 'calendar'
              ? withSystemDates(item, data.fields)
              : item,
            selectedArea,
            data.fields
          )
        ),
    [data, selectedArea]
  )
  const actionRecords: (RecordPage & { occurrence?: CalendarOccurrence })[] =
    area === 'actions'
      ? all.flatMap(item => {
          const schedule = schedules.data?.schedules.find(
            row => row.record_id === item.id && row.settings.recurrence
          )
          if (!schedule) return [item]
          const original =
            data.records.find(record => record.id === item.id) ?? item
          return expandCalendarRecord(
            original,
            dayjs().subtract(30, 'day').startOf('day').toISOString(),
            dayjs().add(31, 'day').startOf('day').toISOString(),
            data.fields,
            schedule
          ).map(occurrence => ({
            ...item,
            date: occurrence.start,
            end_date: occurrence.end,
            done: occurrence.done,
            status: occurrence.done ? 'done' : 'planned',
            occurrence
          }))
        })
      : all
  const items = actionRecords
    .filter(
      item =>
        (!database || item.base_id === database) &&
        item.title.toLowerCase().includes(query.toLowerCase()) &&
        (area !== 'actions' || agendaMatches(item, filter))
    )
    .sort(
      (a, b) =>
        (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
        a.title.localeCompare(b.title)
    )
  const databaseNames = new Map(data.bases.map(base => [base.id, base.name]))
  const suggestedDatabase =
    database ||
    data.bases.find(base => base.source_type === kind)?.id ||
    all[0]?.base_id ||
    ''

  async function patch(
    item: RecordPage & { occurrence?: CalendarOccurrence },
    changes: {
      done?: boolean
      status?: 'planned' | 'active' | 'done'
      priority?: 'low' | 'normal' | 'high' | 'urgent'
      date?: string | null
      end_date?: string | null
    }
  ) {
    if (
      readOnly ||
      busy ||
      (area === 'actions' && (schedules.isLoading || schedules.error))
    )
      return
    if (item.occurrence && workspaceId && changes.done !== undefined) {
      const occurrence = item.occurrence
      await run(() =>
        workspaceAPI.calendar.occurrence
          .input({ workspace_id: workspaceId, record_id: item.id })
          .mutate({
            expected_revision: occurrence.schedule!.revision,
            original: occurrence.original,
            change: { done: changes.done }
          })
      )
      return
    }
    await run(() =>
      api.updateRecord.input({ id: item.id }).mutate({
        title: item.title,
        content: item.content,
        values: item.values,
        expected_updated: item.updated,
        ...changes
      })
    )
  }

  async function create() {
    if (!title.trim()) return

    const result = await run(async () => {
      const base =
        data.bases.find(base => base.id === targetDatabase) ??
        (await api.createBase.mutate({
          name: t(`titles.${selectedArea}`),
          description: ''
        }))

      return api.createRecord.mutate({
        base_id: base.id,
        title: title.trim(),
        item_type: kind,
        tags:
          selectedArea === 'ideas'
            ? ['idea']
            : selectedArea === 'journal'
              ? ['journal']
              : [],
        priority,
        content: '',
        values: {},
        ...(date
          ? {
              date: dayjs(
                kind === 'event' ? date : `${date}T12:00:00`
              ).toISOString()
            }
          : {}),
        ...(kind === 'event'
          ? {
              end_date: dayjs(eventEnd).isAfter(dayjs(date))
                ? dayjs(eventEnd).toISOString()
                : dayjs(date).add(1, 'hour').toISOString()
            }
          : {})
      })
    })

    if (result) {
      setCreating(false)
      setTitle('')
      openRecord(result)
    }
  }

  const row = (item: RecordPage & { occurrence?: CalendarOccurrence }) => (
    <Flex
      key={item.occurrence?.id ?? item.id}
      align="center"
      className="monolith-agenda-row"
      gap="sm"
      minWidth="0"
      px="sm"
      py="sm"
    >
      {area === 'actions' ? (
        <Box
          aria-label={t('complete', { name: item.title })}
          as="input"
          checked={systemStatus(item) === 'done'}
          disabled={
            readOnly || busy || schedules.isLoading || !!schedules.error
          }
          type="checkbox"
          onChange={event => void patch(item, { done: event.target.checked })}
        />
      ) : (
        <Icon
          color="muted"
          icon={
            selectedArea === 'ideas'
              ? 'lucide:lightbulb'
              : area === 'projects'
                ? 'lucide:layers-2'
                : 'lucide:file-text'
          }
          size="1rem"
        />
      )}
      <Button
        flex="1"
        justify="start"
        minWidth="0"
        namespace={false}
        p="xs"
        variant="plain"
        onClick={() => openRecord(item)}
      >
        <Text truncate>{item.title}</Text>
      </Button>
      <Text className="monolith-agenda-source" color="muted" size="xs">
        {databaseNames.get(item.base_id)}
      </Text>
      {['high', 'urgent'].includes(item.priority ?? '') && (
        <Text className="monolith-system-chip" size="xs">
          {t(`priority.${item.priority}`)}
        </Text>
      )}
      {item.date && (
        <Text
          color={
            dayjs(item.date).isBefore(dayjs(), 'day') && !item.done
              ? 'dangerous'
              : 'muted'
          }
          size="xs"
        >
          {dayjs(item.date).format('MMM D')}
        </Text>
      )}
    </Flex>
  )

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (record)
    return (
      <RecordEditor
        key={record.id}
        record={record}
        returnLabel={t('backToView', { name: t(`titles.${area}`) })}
        onDone={closeRecord}
      />
    )
  if (area === 'dashboard') return <SystemDashboard />

  return (
    <Stack className="monolith-system-workspace" gap="lg" minWidth="0" pb="2xl">
      <Flex align="start" gap="md" justify="between" wrap="wrap">
        <Stack flex="1" gap="xs" minWidth="220px" width="auto">
          {area !== 'calendar' && (
            <Text color="muted" size="sm">
              {t('workspaceView')}
            </Text>
          )}
          <Text
            as="h1"
            size={area === 'calendar' ? '2xl' : '3xl'}
            tracking="tight"
            weight="semibold"
          >
            {t(`titles.${area}`)}
          </Text>
          {area !== 'calendar' && (
            <Text color="muted">{t(`descriptions.${area}`)}</Text>
          )}
        </Stack>
        {area === 'calendar' && (
          <Button
            as={Link}
            icon="lucide:calendar-cog"
            namespace={false}
            to={`/calendar/sources?workspace=${params.get('workspace') ?? ''}`}
            variant="plain"
            width="fit-content"
          >
            {t('calendarSources')}
          </Button>
        )}
        <Button
          disabled={readOnly}
          icon="lucide:plus"
          namespace={false}
          onClick={() => {
            setTargetDatabase(suggestedDatabase)
            setCreating(!creating)
          }}
        >
          {t('newItem')}
        </Button>
      </Flex>
      {selectedArea === 'journal' && <JournalActivity records={all} />}

      {(error || stale) && (
        <Flex align="center" gap="sm" role="alert">
          <Text color="dangerous">{error || t('stale')}</Text>
          <Button namespace={false} variant="plain" onClick={retry}>
            {t('retry')}
          </Button>
        </Flex>
      )}
      {area === 'actions' && (
        <Flex
          aria-label={t('agenda')}
          className="monolith-system-tabs"
          gap="xs"
          role="tablist"
        >
          {['today', 'upcoming', 'priority', 'all', 'done'].map(value => (
            <Button
              key={value}
              aria-selected={filter === value}
              data-active={filter === value}
              namespace={false}
              p="sm"
              role="tab"
              variant="plain"
              onClick={() => setFilter(value)}
            >
              {t(`filters.${value}`)}
              <Text as="span" color="muted" size="xs">
                {
                  actionRecords.filter(item => agendaMatches(item, value))
                    .length
                }
              </Text>
            </Button>
          ))}
        </Flex>
      )}
      {area === 'docs' && (
        <Flex
          aria-label={t('titles.docs')}
          className="monolith-system-tabs"
          gap="xs"
          role="tablist"
        >
          {['docs', 'ideas', 'journal'].map(value => (
            <Button
              key={value}
              aria-selected={tab === value}
              data-active={tab === value}
              namespace={false}
              role="tab"
              variant="plain"
              onClick={() => setTab(value)}
            >
              {t(`titles.${value}`)}
            </Button>
          ))}
        </Flex>
      )}
      <Flex align="center" gap="sm" wrap="wrap">
        <Box
          aria-label={t('search')}
          as="input"
          className="monolith-system-input"
          placeholder={t('search')}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Box width={area === 'calendar' ? '220px' : '100%'}>
          <ChoiceSelect
            label={t('database')}
            value={database}
            onChange={setDatabase}
            options={[
              { value: '', label: t('allDatabases') },
              ...data.bases.map(base => ({ value: base.id, label: base.name }))
            ]}
          />
        </Box>
        <Text color="muted" size="sm">
          {t('count', { count: items.length })}
        </Text>
        {area === 'projects' && (
          <Flex
            aria-label={t('view')}
            className="monolith-system-layouts"
            gap="xs"
            role="tablist"
          >
            {['board', 'timeline', 'gantt', 'list'].map(value => (
              <Button
                key={value}
                aria-selected={layout === value}
                namespace={false}
                p="sm"
                role="tab"
                variant={layout === value ? 'secondary' : 'plain'}
                onClick={() => setLayout(value)}
              >
                {t(`layouts.${value}`)}
              </Button>
            ))}
          </Flex>
        )}
      </Flex>
      {creating && (
        <Stack
          as="form"
          className="monolith-system-create"
          gap="sm"
          p="md"
          onSubmit={event => {
            event.preventDefault()
            void create()
          }}
        >
          <Box
            autoFocus
            required
            aria-label={t('title')}
            as="input"
            className="monolith-system-input"
            placeholder={t('title')}
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
          <Flex gap="sm" wrap="wrap">
            <ChoiceSelect
              label={t('saveInDatabase')}
              value={targetDatabase}
              onChange={setTargetDatabase}
              options={[
                {
                  value: '',
                  label: t('createDatabaseFor', {
                    name: t(`titles.${selectedArea}`)
                  })
                },
                ...data.bases.map(base => ({
                  value: base.id,
                  label: base.name
                }))
              ]}
            />
            <Box
              aria-label={t('date')}
              as="input"
              className="monolith-system-input"
              type={area === 'calendar' ? 'datetime-local' : 'date'}
              value={date}
              onChange={event => setDate(event.target.value)}
            />
            {area === 'calendar' && (
              <Box
                as="input"
                aria-label={t('endDate')}
                className="monolith-system-input"
                type="datetime-local"
                value={eventEnd}
                min={date}
                onChange={event => setEventEnd(event.target.value)}
              />
            )}
            <ChoiceSelect
              label={t('priorityLabel')}
              value={priority}
              onChange={value => setPriority(value as typeof priority)}
              options={['low', 'normal', 'high', 'urgent'].map(value => ({
                value,
                label: t(`priority.${value}`)
              }))}
            />
            <Button loading={busy} namespace={false} type="submit">
              {t('create')}
            </Button>
            <Button
              namespace={false}
              type="button"
              variant="plain"
              onClick={() => setCreating(false)}
            >
              {t('cancel')}
            </Button>
          </Flex>
        </Stack>
      )}
      {area === 'calendar' ? (
        <DatabaseCalendar
          fields={data.fields}
          records={items}
          view={{
            id: 'system-calendar',
            base_id: '',
            name: t('titles.calendar'),
            mode: 'calendar',
            group_field_id: null,
            config: viewConfigSchema.parse({
              date_field_id: 'date',
              end_date_field_id: 'end_date'
            })
          }}
          onCreate={values => {
            setTargetDatabase(suggestedDatabase)
            setDate(dayjs(String(values.date)).format('YYYY-MM-DDTHH:mm'))
            setEventEnd(
              dayjs(String(values.end_date)).format('YYYY-MM-DDTHH:mm')
            )
            setCreating(true)
          }}
        />
      ) : area === 'projects' && layout === 'board' ? (
        <Box overflowX="auto">
          <Grid gap="md" templateCols="repeat(3, minmax(260px, 1fr))">
            {(['planned', 'active', 'done'] as const).map(status => (
              <Stack
                key={status}
                className="monolith-project-column"
                gap="sm"
                p="sm"
                onDragOver={event => {
                  if (
                    !readOnly &&
                    hasInternalDragData(
                      event.nativeEvent,
                      'application/x-monolith-project'
                    )
                  )
                    event.preventDefault()
                }}
                onDrop={event => {
                  const item = items.find(
                    item =>
                      item.id ===
                      getInternalDragData(
                        event.nativeEvent,
                        'application/x-monolith-project'
                      )
                  )

                  if (item && !readOnly) {
                    event.preventDefault()
                    void patch(item, { status })
                  }
                }}
              >
                <Flex align="center" gap="sm" px="xs" py="sm">
                  <Text
                    aria-hidden="true"
                    as="span"
                    className="monolith-system-dot"
                  >
                    ●
                  </Text>
                  <Text size="sm" weight="medium">
                    {t(`status.${status}`)}
                  </Text>
                  <Text color="muted" size="xs">
                    {items.filter(item => systemStatus(item) === status).length}
                  </Text>
                </Flex>
                {items
                  .filter(item => systemStatus(item) === status)
                  .map(item => (
                    <Card
                      key={item.id}
                      className="monolith-project-card"
                      draggable={!readOnly && !busy}
                      gap="sm"
                      p="md"
                      onDragStart={event => {
                        setInternalDragData(
                          event.nativeEvent,
                          'application/x-monolith-project',
                          item.id
                        )
                        event.dataTransfer.effectAllowed = 'move'
                        elasticDragPreview(
                          event.nativeEvent,
                          item.title,
                          event.currentTarget
                        )
                      }}
                    >
                      <Button
                        justify="start"
                        namespace={false}
                        p="none"
                        variant="plain"
                        onClick={() => openRecord(item)}
                      >
                        {item.title}
                      </Button>
                      <Text color="muted" size="xs">
                        {databaseNames.get(item.base_id)}
                      </Text>
                      <Flex align="center" gap="sm" wrap="wrap">
                        {item.date && (
                          <Text color="muted" size="xs">
                            {dayjs(item.date).format('MMM D')}
                          </Text>
                        )}
                        <ChoiceSelect
                          label={t('moveProject', { name: item.title })}
                          disabled={readOnly || busy}
                          value={systemStatus(item)}
                          onChange={value =>
                            void patch(item, {
                              status: value as typeof status
                            })
                          }
                          options={['planned', 'active', 'done'].map(value => ({
                            value,
                            label: t(`status.${value}`)
                          }))}
                        />
                      </Flex>
                    </Card>
                  ))}
              </Stack>
            ))}
          </Grid>
        </Box>
      ) : area === 'projects' && ['gantt', 'timeline'].includes(layout) ? (
        <ProjectTimeline gantt={layout === 'gantt'} items={items} />
      ) : (
        <Stack gap="none">{items.map(row)}</Stack>
      )}
      {area === 'actions' && schedules.error && (
        <Text role="alert" color="dangerous">
          {schedules.error.message}
        </Text>
      )}
      {area === 'actions' &&
        schedules.data?.schedules.some(row => row.settings.recurrence) && (
          <Text size="sm" color="muted">
            {t('recurringWindow')}
          </Text>
        )}
      {!items.length && area !== 'calendar' && (
        <Stack align="center" gap="sm" py="2xl">
          <Icon
            color="muted"
            icon={area === 'actions' ? 'lucide:circle-check' : 'lucide:files'}
            size="2rem"
          />
          <Text weight="medium">{t('empty')}</Text>
          <Text color="muted" size="sm">
            {t('emptyHelp')}
          </Text>
        </Stack>
      )}
    </Stack>
  )
}

function SystemDashboard() {
  const { pageStorage } = useCanvasWidgets()
  const { t } = useTranslation('common.widgets')

  const storage = pageStorage?.('/dashboard')

  return (
    <WorkspaceCanvas
      key={storage ? JSON.stringify(storage.queryKey) : '/dashboard'}
      native={<SystemAnalytics />}
      storage={storage ? { ...storage, title: t('dashboard') } : undefined}
      title={t('dashboard')}
      widgetScope="dashboard"
    />
  )
}

function SystemAnalytics() {
  const { data, people, loading, error, retry } = useDatabases(),
    { t } = useTranslation('common.systemViews')
  const actions = data.records
      .map(item => withSystemDates(item, data.fields))
      .filter(item => belongsToSystem(item, 'actions', data.fields)),
    completed = actions.filter(item => systemStatus(item) === 'done').length
  const states = ['planned', 'active', 'done'].map(status => ({
    label: t(`status.${status}`),
    value: actions.filter(item => systemStatus(item) === status).length
  }))
  const priorities = ['urgent', 'high', 'normal', 'low'].map(priority => ({
    label: t(`priority.${priority}`),
    value: actions.filter(
      item => !item.done && (item.priority ?? 'normal') === priority
    ).length
  }))
  const assignees = new Map<string, number>()

  for (const action of actions) {
    if (systemStatus(action) === 'done') continue

    const owners = [
      ...new Set(
        data.fields
          .filter(
            field => field.base_id === action.base_id && field.kind === 'person'
          )
          .map(field => action.values[field.id])
          .filter(
            (value): value is string => typeof value === 'string' && !!value
          )
      )
    ]

    for (const owner of owners.length ? owners : [''])
      assignees.set(owner, (assignees.get(owner) ?? 0) + 1)
  }
  if (loading) return <Text role="status">{t('loading')}</Text>

  return (
    <Stack gap="lg" pb="2xl">
      <Stack gap="xs">
        <Text color="muted" size="sm">
          {t('workspaceView')}
        </Text>
        <Text as="h2" size="xl" weight="semibold">
          {t('titles.dashboard')}
        </Text>
        <Text color="muted">{t('descriptions.dashboard')}</Text>
      </Stack>
      {error && (
        <Flex gap="sm" role="alert">
          <Text color="dangerous">{error}</Text>
          <Button namespace={false} onClick={retry}>
            {t('retry')}
          </Button>
        </Flex>
      )}
      <Grid gap="md" templateCols={{ base: 2, md: 4 }}>
        {[
          ['actions', actions.filter(item => !item.done).length],
          [
            'projects',
            data.records
              .map(item => withSystemDates(item, data.fields))
              .filter(item => belongsToSystem(item, 'projects', data.fields))
              .length
          ],
          [
            'docs',
            data.records
              .map(item => withSystemDates(item, data.fields))
              .filter(item => belongsToSystem(item, 'docs', data.fields)).length
          ],
          ['databases', data.bases.length]
        ].map(([key, value]) => (
          <Card key={key} gap="xs" p="lg">
            <Text color="muted" size="sm">
              {t(`titles.${key}`)}
            </Text>
            <Text size="3xl" weight="semibold">
              {value}
            </Text>
          </Card>
        ))}
      </Grid>
      <Grid gap="md" templateCols={{ base: 1, lg: 2 }}>
        <Card gap="lg" p="lg">
          <Text as="h2" weight="semibold">
            {t('byStatus')}
          </Text>
          <Flex align="center" gap="lg" wrap="wrap">
            <ProgressRing
              label={t('completed')}
              max={Math.max(1, actions.length)}
              value={completed}
            />
            <Box flex="1" minWidth="180px">
              <HorizontalBarChart label={t('byStatus')} points={states} />
            </Box>
          </Flex>
        </Card>
        <Card gap="lg" p="lg">
          <Text as="h2" weight="semibold">
            {t('byPriority')}
          </Text>
          <HorizontalBarChart label={t('byPriority')} points={priorities} />
        </Card>
        <Card gap="lg" p="lg">
          <Text as="h2" weight="semibold">
            {t('byDatabase')}
          </Text>
          <HorizontalBarChart
            label={t('byDatabase')}
            points={data.bases.map(base => ({
              label: base.name,
              value: actions.filter(item => item.base_id === base.id).length
            }))}
          />
        </Card>
        <Card gap="lg" p="lg">
          <Text as="h2" weight="semibold">
            {t('byAssignee')}
          </Text>
          <HorizontalBarChart
            label={t('byAssignee')}
            points={[...assignees].map(([id, value]) => ({
              label:
                people.find(person => person.id === id)?.label ??
                t('unassigned'),
              value
            }))}
          />
        </Card>
        <Card gap="md" p="lg">
          <Text as="h2" weight="semibold">
            {t('dailyFocus')}
          </Text>
          <Text size="3xl" weight="semibold">
            {actions.filter(item => agendaMatches(item, 'today')).length}
          </Text>
          <Text color="muted">{t('dueToday')}</Text>
          <Button
            as={Link}
            icon="lucide:arrow-up-right"
            namespace={false}
            to={`/actions?${new URLSearchParams({ workspace: new URLSearchParams(location.search).get('workspace') ?? '' })}`}
            variant="secondary"
          >
            {t('openAgenda')}
          </Button>
        </Card>
      </Grid>
    </Stack>
  )
}
