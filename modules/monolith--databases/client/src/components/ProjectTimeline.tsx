import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { Box, Button, Flex, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { systemStatus, withSystemDates } from '@/utils/systemViews'

import type { RecordPage } from '../../../shared'

export function ProjectTimeline({
  items,
  gantt
}: {
  items: RecordPage[]
  gantt: boolean
}) {
  const { data, openRecord } = useDatabases(),
    { t } = useTranslation('common.systemViews')
  const rows = items.flatMap(project => {
    const actions = data.records
      .filter(item => item.project_id === project.id)
      .map(item => withSystemDates(item, data.fields))
    const starts = [project.date, ...actions.map(item => item.date)]
      .filter((date): date is string => !!date && dayjs(date).isValid())
      .sort()
    const ends = [
      project.end_date || project.date,
      ...actions.map(item => item.end_date || item.date)
    ]
      .filter((date): date is string => !!date && dayjs(date).isValid())
      .sort()
    const parent = {
      ...project,
      date: project.date || starts[0] || null,
      end_date: project.end_date || ends[ends.length - 1] || null,
      child: false,
      progress: actions.length
        ? Math.round(
            (actions.filter(item => systemStatus(item) === 'done').length /
              actions.length) *
              100
          )
        : systemStatus(project) === 'done'
          ? 100
          : 0
    }
    return [
      parent,
      ...(gantt
        ? actions.map(item => ({
            ...item,
            child: true,
            progress: systemStatus(item) === 'done' ? 100 : 0
          }))
        : [])
    ]
  })
  const dates = rows
    .flatMap(item => [item.date, item.end_date])
    .filter((date): date is string => !!date && dayjs(date).isValid())
    .sort()
  const start = dayjs(dates[0] ?? new Date())
    .startOf('day')
    .subtract(1, 'day')
  const span = Math.max(
    14,
    dayjs(dates[dates.length - 1] ?? start.add(14, 'day')).diff(start, 'day') +
      3
  )
  const today = (dayjs().startOf('day').diff(start, 'day') / span) * 100
  return (
    <Stack gap="sm">
      <Box overflowX="auto">
        <Box
          className="monolith-timeline"
          data-layout={gantt ? 'gantt' : 'timeline'}
        >
          <Flex className="monolith-timeline-scale" justify="between">
            {Array.from({ length: 7 }, (_, index) => (
              <Text key={index} size="xs" color="muted">
                {start
                  .add(Math.round((index * span) / 6), 'day')
                  .format('MMM D')}
              </Text>
            ))}
          </Flex>
          {rows.map(item => {
            const left = item.date
                ? (dayjs(item.date).diff(start, 'day') / span) * 100
                : 0,
              width = item.date
                ? (Math.max(
                    1,
                    dayjs(item.end_date || item.date).diff(
                      dayjs(item.date),
                      'day'
                    ) + 1
                  ) /
                    span) *
                  100
                : 0
            return (
              <Flex
                key={item.id}
                className="monolith-timeline-row"
                align="center"
                data-child={item.child}
              >
                <Button
                  namespace={false}
                  variant="plain"
                  className="monolith-timeline-label"
                  justify="start"
                  onClick={() => openRecord(item)}
                >
                  <Text truncate size="sm">
                    {item.child ? '↳ ' : ''}
                    {item.title}
                  </Text>
                </Button>
                <Box className="monolith-timeline-track">
                  {today >= 0 && today <= 100 && (
                    <Box
                      className="monolith-timeline-today"
                      style={{ left: `${today}%` }}
                    />
                  )}
                  {item.date ? (
                    <Button
                      namespace={false}
                      className="monolith-timeline-bar"
                      data-done={systemStatus(item) === 'done'}
                      style={{
                        left: `${left}%`,
                        width: `${Math.min(width, 100 - left)}%`
                      }}
                      aria-label={`${item.title}: ${dayjs(item.date).format('MMM D')} – ${dayjs(item.end_date || item.date).format('MMM D')} · ${item.progress}%`}
                      title={`${item.title} · ${item.progress}%`}
                      onClick={() => openRecord(item)}
                    >
                      <Box
                        className="monolith-timeline-progress"
                        style={{ width: `${item.progress}%` }}
                      />
                      <Text size="xs">{item.title}</Text>
                    </Button>
                  ) : (
                    <Text color="muted" size="xs" p="sm">
                      {t('unscheduled')}
                    </Text>
                  )}
                </Box>
              </Flex>
            )
          })}
        </Box>
      </Box>
      <Text size="sm" color="muted">
        {t(gantt ? 'ganttHelp' : 'timelineHelp')}
      </Text>
    </Stack>
  )
}
