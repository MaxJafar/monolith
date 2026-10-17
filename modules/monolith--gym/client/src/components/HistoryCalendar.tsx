import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Stack,
  Text,
  colorWithOpacity
} from '@monolith/ui'

import { useGym } from '@/GymContext'

import { rangeTotals } from '../utils/analytics'
import { historyMonth } from '../utils/historyCalendar'
import { clock, weightDisplay } from '../utils/workout'

export function HistoryCalendar({
  onSelectWorkout
}: {
  onSelectWorkout: (id: string) => void
}) {
  const { data, navigate } = useGym()
  const { t } = useModuleTranslation()
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  if (!data) return null

  const calendar = historyMonth(
    month,
    data.workouts,
    data.schedule,
    data.routines
  )
  const totals = rangeTotals(calendar.completed)
  const selected = calendar.days.find(day => day.date === selectedDay)
  const today = dayjs().format('YYYY-MM-DD')

  function moveMonth(offset: number) {
    setMonth(dayjs(`${month}-01`).add(offset, 'month').format('YYYY-MM'))
    setSelectedDay(null)
  }

  return (
    <Card gap="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('history.calendarTitle')}
      </Text>
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Button
          aria-label={t('history.monthPrevious')}
          icon="tabler:chevron-left"
          variant="plain"
          onClick={() => moveMonth(-1)}
        />
        <Text as="h4" size="lg" weight="semibold">
          {dayjs(`${month}-01`).format('MMMM YYYY')}
        </Text>
        <Button
          aria-label={t('history.monthNext')}
          icon="tabler:chevron-right"
          variant="plain"
          onClick={() => moveMonth(1)}
        />
        <Button
          variant="plain"
          onClick={() => {
            setMonth(dayjs().format('YYYY-MM'))
            setSelectedDay(null)
          }}
        >
          history.monthToday
        </Button>
      </Flex>
      <Text color="muted">
        {t('history.monthSummary', {
          count: totals.workouts,
          duration: clock(totals.duration),
          volume: weightDisplay(totals.volume, data.settings.unit),
          unit: data.settings.unit
        })}
      </Text>
      <Box overflowX="auto">
        <Grid
          aria-label={t('history.calendarTitle')}
          gap="xs"
          minWidth="22rem"
          templateCols={7}
        >
          {[1, 2, 3, 4, 5, 6, 0].map(weekday => (
            <Text key={weekday} align="center" color="muted" size="sm">
              {dayjs().day(weekday).format('dd')}
            </Text>
          ))}
          {calendar.days.map(day => {
            const plan = day.explicit_rest
              ? t('history.calendarRest')
              : (day.routine?.name ?? '—')

            return (
              <Card
                key={day.date}
                isInteractive
                aria-current={day.date === today ? 'date' : undefined}
                aria-label={t('history.calendarDay', {
                  date: day.date,
                  completed: day.completed.length,
                  plan
                })}
                aria-pressed={selectedDay === day.date}
                as="button"
                bg={{
                  base: colorWithOpacity(
                    selectedDay === day.date ? 'primary' : 'muted',
                    selectedDay === day.date
                      ? '20%'
                      : day.in_month
                        ? '10%'
                        : '5%'
                  )
                }}
                gap="xs"
                minHeight="4.5rem"
                p="sm"
                onClick={() =>
                  setSelectedDay(selectedDay === day.date ? null : day.date)
                }
              >
                <Text
                  align="center"
                  color={
                    day.date === today
                      ? 'primary'
                      : day.in_month
                        ? undefined
                        : 'muted'
                  }
                  weight={
                    day.date === today || selectedDay === day.date
                      ? 'bold'
                      : 'normal'
                  }
                >
                  {dayjs(day.date).date()}
                </Text>
                <Flex aria-hidden="true" gap="xs" justify="center" wrap="wrap">
                  {day.completed.length > 0 && (
                    <Text color="primary" size="xs" weight="semibold">
                      ✓ {day.completed.length}
                    </Text>
                  )}
                  {day.routine && (
                    <Text color={day.override ? 'primary' : 'muted'} size="xs">
                      {day.override ? '↗' : '•'}
                    </Text>
                  )}
                  {day.explicit_rest && (
                    <Text color="muted" size="xs">
                      —
                    </Text>
                  )}
                </Flex>
              </Card>
            )
          })}
        </Grid>
      </Box>
      <Flex gap="md" wrap="wrap">
        <Text color="primary">✓ {t('history.completed')}</Text>
        <Text color="muted">• {t('history.calendarPlanned')}</Text>
        <Text color="primary">↗ {t('history.calendarRescheduled')}</Text>
        <Text color="muted">— {t('history.calendarRest')}</Text>
      </Flex>
      <Text color="muted">{t('history.calendarHelp')}</Text>
      {selected && (
        <Stack gap="sm">
          <Flex align="center" gap="sm" justify="between" wrap="wrap">
            <Text weight="semibold">
              {t('history.calendarSelected', {
                date: dayjs(selected.date).format('ll')
              })}
            </Text>
            <Button variant="plain" onClick={() => setSelectedDay(null)}>
              history.allDays
            </Button>
          </Flex>
          {selected.explicit_rest && (
            <Text color="muted">
              {t('history.calendarRest')} · {t('history.calendarRescheduled')}
            </Text>
          )}
          {selected.routine && (
            <Flex align="center" gap="sm" justify="between" wrap="wrap">
              <Text>
                {selected.override
                  ? t('history.calendarRescheduled')
                  : t('history.calendarPlanned')}
                : {selected.routine.name}
              </Text>
              <Button
                variant="secondary"
                onClick={() =>
                  navigate('plan', { routine: selected.routine!.id })
                }
              >
                history.calendarViewPlan
              </Button>
            </Flex>
          )}
          {selected.completed.map(workout => (
            <Flex
              key={workout.id}
              align="center"
              gap="sm"
              justify="between"
              wrap="wrap"
            >
              <Text>{workout.name}</Text>
              <Button
                variant="secondary"
                onClick={() => onSelectWorkout(workout.id)}
              >
                viewWorkout
              </Button>
            </Flex>
          ))}
          {selected.completed.length === 0 &&
            !selected.routine &&
            !selected.explicit_rest && (
              <Text color="muted">{t('history.calendarEmptyDay')}</Text>
            )}
        </Stack>
      )}
    </Card>
  )
}
