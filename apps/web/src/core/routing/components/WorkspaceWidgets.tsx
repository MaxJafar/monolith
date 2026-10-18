import {
  Box,
  Button,
  type CanvasWidgetConfiguration,
  Flex,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import {
  agendaMatches,
  belongsToSystem,
  systemStatus,
  withSystemDates
} from '../../../../../../modules/monolith--databases/client/src/utils/systemViews'
import type {
  RecordPage,
  Snapshot
} from '../../../../../../modules/monolith--databases/shared'
import { WeatherWidget } from './WeatherWidget'
import { CalendarWidget } from './CalendarWidget'
import { HabitWidget } from './HabitWidget'
import { MarketWidget } from './MarketWidget'
import './workspaceWidgets.css'

export const coreWidgets = {
  workspacePulse: 'lucide:chart-no-axes-combined',
  actionAgenda: 'lucide:circle-check',
  projectFocus: 'lucide:kanban',
  quickLinks: 'lucide:compass',
  weather: 'lucide:cloud-sun',
  calendarWidget: 'lucide:calendar-days',
  habitTracker: 'lucide:repeat',
  marketTracker: 'lucide:chart-no-axes-combined',
  upcomingEvents: 'lucide:calendar-days'
}

export function WorkspaceWidget({
  id,
  data,
  workspaceId,
  readOnly,
  configuration,
  loading,
  failed,
  retry
}: {
  id: string
  data?: Snapshot
  workspaceId: string
  readOnly: boolean
  configuration?: CanvasWidgetConfiguration
  loading: boolean
  failed: boolean
  retry: () => void
}) {
  const { t, i18n } = useTranslation('common.widgets')
  const { t: ui } = useTranslation('common.workspaceUI')
  const cache = useQueryClient()

  const [filter, setFilter] = useState('today'),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState('')
  const records = (data?.records ?? []).map(item =>
    withSystemDates(item, data?.fields ?? [])
  )
  const actions = records.filter(item =>
    belongsToSystem(item, 'actions', data?.fields)
  )
  const projects = records.filter(item =>
    belongsToSystem(item, 'projects', data?.fields)
  )
  const href = (area: string) =>
    `/${area}?${new URLSearchParams({ workspace: workspaceId })}`
  const recordHref = (item: RecordPage) =>
    `/databases?${new URLSearchParams({ workspace: workspaceId, base: item.base_id, record: item.id })}`

  async function toggle(item: RecordPage) {
    if (readOnly || busy || failed) return
    setBusy(item.id)
    setError('')

    try {
      await workspaceAPI.workspaceDatabases.updateRecord
        .input({ id: item.id, workspace_id: workspaceId })
        .mutate({
          title: item.title,
          content: item.content,
          values: item.values,
          expected_updated: item.updated,
          done: systemStatus(item) !== 'done',
          status: systemStatus(item) === 'done' ? 'planned' : 'done'
        })
      await cache.invalidateQueries({
        queryKey: workspaceAPI.workspaceDatabases.snapshot.key
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(null)
    }
  }
  if (id === 'weather')
    return <WeatherWidget configuration={configuration} readOnly={readOnly} />
  if (id === 'habitTracker')
    return <HabitWidget workspaceId={workspaceId} configuration={configuration} readOnly={readOnly} />
  if (id === 'marketTracker')
    return <MarketWidget workspaceId={workspaceId} configuration={configuration} />
  if (id === 'quickLinks')
    return (
      <Stack gap="sm">
        {(
          ['calendar', 'projects', 'actions', 'docs', 'databases'] as const
        ).map(area => (
          <Button
            key={area}
            as={Link}
            icon="lucide:arrow-up-right"
            iconPosition="end"
            justify="between"
            namespace={false}
            to={href(area)}
            variant="plain"
          >
            {t(`areas.${area}`)}
          </Button>
        ))}
      </Stack>
    )
  if (loading)
    return (
      <Text color="muted" role="status">
        {t('loading')}
      </Text>
    )
  if (failed)
    return (
      <Stack gap="sm">
        <Text role="alert">{t('loadError')}</Text>
        <Button namespace={false} variant="secondary" onClick={retry}>
          {t('retry')}
        </Button>
      </Stack>
    )

  if (id === 'calendarWidget')
    return <CalendarWidget records={records} workspaceId={workspaceId} configuration={configuration} />

  if (id === 'upcomingEvents') {
    const upcoming = records
      .filter(
        item =>
          belongsToSystem(item, 'calendar') &&
          item.date &&
          !dayjs(item.date).isBefore(dayjs(), 'day')
      )
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      .slice(0, 4)

    return (
      <Stack gap="xs">
        {upcoming.map(item => (
          <Button
            key={item.id}
            as={Link}
            justify="start"
            namespace={false}
            p="xs"
            to={recordHref(item)}
            variant="plain"
          >
            <Stack gap="xs" minWidth="0">
              <Text truncate size="sm">
                {item.title}
              </Text>
              <Text color="muted" size="xs">
                {dayjs(item.date).format('ddd, MMM D · HH:mm')}
              </Text>
            </Stack>
          </Button>
        ))}
        {!upcoming.length && (
          <Text color="muted" size="sm">
            {ui('noEvents')}
          </Text>
        )}
        <Button
          as={Link}
          icon="lucide:arrow-up-right"
          justify="start"
          namespace={false}
          p="xs"
          to={href('calendar')}
          variant="plain"
        >
          {ui('viewCalendar')}
        </Button>
      </Stack>
    )
  }

  if (id === 'workspacePulse') {
    const done = actions.filter(item => systemStatus(item) === 'done').length

    return (
      <Stack gap="md">
        <Box className="workspace-pulse">
          {[
            ['openActions', actions.length - done, 'actions'],
            [
              'activeProjects',
              projects.filter(item => systemStatus(item) !== 'done').length,
              'projects'
            ],
            ['completed', done, 'actions'],
            ['databases', data?.bases.length ?? 0, 'databases']
          ].map(([label, value, area]) => (
            <Box
              key={label}
              as={Link}
              className="workspace-pulse-stat"
              to={href(String(area))}
            >
              <Text size="3xl" weight="semibold">
                {value}
              </Text>
              <Text color="muted" size="sm">
                {t(String(label))}
              </Text>
            </Box>
          ))}
        </Box>
        <Box
          aria-label={t('completed')}
          aria-valuemax={Math.max(1, actions.length)}
          aria-valuemin={0}
          aria-valuenow={done}
          className="workspace-progress"
          role="progressbar"
        >
          <span
            style={{
              width: `${actions.length ? (done / actions.length) * 100 : 0}%`
            }}
          />
        </Box>
      </Stack>
    )
  }
  if (id === 'projectFocus')
    return (
      <Stack gap="sm">
        {projects
          .filter(item => systemStatus(item) !== 'done')
          .slice(0, 5)
          .map(item => (
            <Box
              key={item.id}
              as={Link}
              className="workspace-widget-row"
              to={recordHref(item)}
            >
              <Icon color="muted" icon="lucide:folder" />
              <Stack gap="xs" minWidth="0">
                <Text truncate weight="medium">
                  {item.title}
                </Text>
                <Text color="muted" size="sm">
                  {data?.bases.find(base => base.id === item.base_id)?.name}
                </Text>
              </Stack>
              <Text className="workspace-status" size="sm">
                {t(`status.${systemStatus(item)}`)}
              </Text>
            </Box>
          ))}
        {!projects.some(item => systemStatus(item) !== 'done') && (
          <WidgetEmpty
            help={t('projectsHelp')}
            icon="lucide:flag"
            label={t('noProjects')}
          />
        )}
        <Button
          as={Link}
          icon="lucide:arrow-up-right"
          namespace={false}
          to={href('projects')}
          variant="plain"
        >
          {t('allProjects')}
        </Button>
      </Stack>
    )

  const agenda = actions
    .filter(item => agendaMatches(item, filter))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .slice(0, 6)

  return (
    <Stack gap="md">
      <Flex aria-label={t('agendaFilter')} gap="xs" role="group" wrap="wrap">
        {['today', 'upcoming', 'priority', 'all'].map(value => (
          <Button
            key={value}
            aria-pressed={filter === value}
            namespace={false}
            variant={filter === value ? 'secondary' : 'plain'}
            onClick={() => setFilter(value)}
          >
            {t(`filter.${value}`)}
          </Button>
        ))}
      </Flex>
      {error && (
        <Text color="dangerous" role="alert" size="sm">
          {error}
        </Text>
      )}
      <Stack gap="none">
        {agenda.map(item => (
          <Flex
            key={item.id}
            align="center"
            className="workspace-widget-row"
            gap="sm"
          >
            <Box
              aria-label={t('complete', { title: item.title })}
              as="input"
              checked={systemStatus(item) === 'done'}
              disabled={readOnly || !!busy}
              type="checkbox"
              onChange={() => void toggle(item)}
            />
            <Box as={Link} flex="1" minWidth="0" to={recordHref(item)}>
              <Text truncate size="sm" weight="medium">
                {item.title}
              </Text>
              <Text color="muted" size="xs">
                {item.date
                  ? new Date(
                      item.date.includes('T')
                        ? item.date
                        : `${item.date}T12:00:00`
                    ).toLocaleDateString(i18n.language, {
                      month: 'short',
                      day: 'numeric'
                    })
                  : t('noDate')}
              </Text>
            </Box>
            {['high', 'urgent'].includes(item.priority ?? '') && (
              <Icon color="muted" icon="lucide:flag" size="14px" />
            )}
          </Flex>
        ))}
      </Stack>
      {!agenda.length && (
        <WidgetEmpty
          help={t('agendaHelp')}
          icon="lucide:circle-check"
          label={t('clearAgenda')}
        />
      )}
      <Button
        as={Link}
        icon="lucide:arrow-up-right"
        namespace={false}
        to={href('actions')}
        variant="plain"
      >
        {t('allActions')}
      </Button>
    </Stack>
  )
}

function WidgetEmpty({
  icon,
  label,
  help
}: {
  icon: string
  label: string
  help: string
}) {
  return (
    <Stack align="center" gap="sm" py="xl">
      <Icon color="muted" icon={icon} size="28px" />
      <Text size="sm" weight="medium">
        {label}
      </Text>
      <Text align="center" color="muted" size="sm">
        {help}
      </Text>
    </Stack>
  )
}
