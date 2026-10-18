import {
  Box,
  Button,
  type CanvasWidgetConfiguration,
  ChoiceSelect,
  Flex,
  Grid,
  Stack,
  Text
} from '@monolith/ui'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useRpg } from '@/addons/urpg/useRpg'

import type { RecordPage } from '../../../../../../modules/monolith--databases/shared'
import { widgetConfig } from '../../../../../../modules/monolith--databases/widgetShared'

export function CalendarWidget({
  records,
  workspaceId,
  configuration
}: {
  records: RecordPage[]
  workspaceId: string
  configuration?: CanvasWidgetConfiguration
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' }),
    rpg = useRpg()
  const config = widgetConfig(configuration?.filter),
    mode = ['week', 'month', 'agenda'].includes(config.mode ?? '')
      ? config.mode!
      : 'month'
  const [day, setDay] = useState(() => dayjs().format('YYYY-MM-DD'))
  const date = dayjs(day),
    month = date.startOf('month'),
    first =
      mode === 'month'
        ? month.subtract((month.day() + 6) % 7, 'day')
        : date.subtract((date.day() + 6) % 7, 'day')
  const days = Array.from({ length: mode === 'month' ? 42 : 7 }, (_, index) =>
    first.add(index, 'day')
  )
  const events = [
    ...records
      .filter(r => r.date)
      .map(r => ({
        id: r.id,
        title: r.title,
        date: dayjs(r.date).format('YYYY-MM-DD'),
        href: `/databases?workspace=${workspaceId}&base=${r.base_id}&record=${r.id}`
      })),
    ...(rpg.state?.encounters ?? []).map(e => ({
      id: e.id,
      title: e.title,
      date: e.day,
      href: `/urpg?workspace=${workspaceId}&view=encounters`
    })),
    ...(rpg.state?.items ?? [])
      .filter(i => i.due && !i.archived)
      .map(i => ({
        id: i.id,
        title: i.title,
        date: i.due!,
        href: `/urpg?workspace=${workspaceId}&view=quests`
      }))
  ]
  const shown = events
    .filter(e => (mode === 'agenda' ? e.date >= day : e.date === day))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
  return (
    <Stack gap="sm">
      <Flex align="center" justify="between" gap="xs">
        <Button
          namespace={false}
          variant="plain"
          p="xs"
          icon="lucide:chevron-left"
          aria-label={t('previous')}
          onClick={() =>
            setDay(
              date
                .subtract(1, mode === 'month' ? 'month' : 'week')
                .format('YYYY-MM-DD')
            )
          }
        />
        <Text size="xs" weight="medium">
          {new Intl.DateTimeFormat(i18n.language, {
            month: 'long',
            year: 'numeric'
          }).format(date.toDate())}
        </Text>
        <Button
          namespace={false}
          variant="plain"
          p="xs"
          icon="lucide:chevron-right"
          aria-label={t('next')}
          onClick={() =>
            setDay(
              date
                .add(1, mode === 'month' ? 'month' : 'week')
                .format('YYYY-MM-DD')
            )
          }
        />
      </Flex>
      {configuration?.onConfigChange && (
        <ChoiceSelect
          label={t('calendarView')}
          value={mode}
          options={['week', 'month', 'agenda'].map(value => ({
            value,
            label: t(value)
          }))}
          onChange={mode =>
            configuration.onConfigChange?.(JSON.stringify({ ...config, mode }))
          }
        />
      )}
      {mode !== 'agenda' && (
        <Grid templateCols={7} gap="none">
          {days.slice(0, 7).map(d => (
            <Text
              key={`day-${d.day()}`}
              size="xs"
              color="muted"
              align="center"
              py="xs"
            >
              {new Intl.DateTimeFormat(i18n.language, {
                weekday: 'narrow'
              }).format(d.toDate())}
            </Text>
          ))}
          {days.map(d => (
            <Button
              key={d.format('YYYY-MM-DD')}
              namespace={false}
              variant="plain"
              className="workspace-calendar-day"
              aria-label={d.format('YYYY-MM-DD')}
              aria-pressed={day === d.format('YYYY-MM-DD')}
              data-today={d.isSame(dayjs(), 'day')}
              data-outside={mode === 'month' && !d.isSame(month, 'month')}
              onClick={() => setDay(d.format('YYYY-MM-DD'))}
            >
              <Text size="xs">{d.date()}</Text>
              {events.some(e => e.date === d.format('YYYY-MM-DD')) && (
                <Box className="workspace-calendar-dot" />
              )}
            </Button>
          ))}
        </Grid>
      )}
      {shown.map(e => (
        <Button
          key={e.id}
          as={Link}
          to={e.href}
          namespace={false}
          variant="plain"
          p="xs"
          justify="start"
        >
          <Stack gap="xs" minWidth="0">
            <Text truncate size="xs">
              {e.title}
            </Text>
            {mode === 'agenda' && (
              <Text size="xs" color="muted">
                {e.date}
              </Text>
            )}
          </Stack>
        </Button>
      ))}
      {!shown.length && (
        <Text color="muted" size="xs">
          {t('noEvents')}
        </Text>
      )}
      <Button
        namespace={false}
        variant="plain"
        p="xs"
        onClick={() => setDay(dayjs().format('YYYY-MM-DD'))}
      >
        {t('today')}
      </Button>
    </Stack>
  )
}
