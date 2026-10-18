import dayjs from 'dayjs'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Grid, Stack, Text } from '@monolith/ui'

import { useGym } from '@/GymContext'

import { scheduledRoutine } from '../../../shared'
import { StartWorkout } from '../components/StartWorkout'
import { weightDisplay } from '../utils/workout'

export default function DashboardView() {
  const { data, navigate } = useGym()
  const { t } = useModuleTranslation()

  if (!data) return null

  const today = dayjs().format('YYYY-MM-DD')
  const scheduled = scheduledRoutine(data.schedule, today)
  const routine = data.routines.find(routine => routine.id === scheduled)
  const override = data.schedule.some(item => item.date === today)
  const latestWeight = data.bodyweight
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const latestWorkout = data.workouts
    .filter(workout => workout.status === 'completed')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0]

  return (
    <Stack gap="lg">
      <Card gap="md">
        <Text color="primary">{dayjs().format('dddd, LL')}</Text>
        <Text as="h2" size="3xl" weight="semibold">
          {routine?.name ?? t('plan.restDay')}
        </Text>
        <Text color="muted">
          {t(override ? 'dashboard.rescheduled' : 'dashboard.todayPlan')}
        </Text>
        <Flex gap="sm" wrap="wrap">
          {data.active ? (
            <Button
              icon="tabler:player-play"
              namespace={false}
              onClick={() => navigate('workout')}
            >
              {t('dashboard.resume', { name: data.active.name })}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('plan')}>
              editPlan
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('stats')}>
            viewStats
          </Button>
        </Flex>
      </Card>
      <Grid gap="md" templateCols={{ base: 1, sm: 2, lg: 4 }}>
        {[
          { key: 'workouts', value: data.stats.workouts },
          { key: 'sets', value: data.stats.completed_sets },
          { key: 'streak', value: data.stats.streak_weeks },
          {
            key: 'weight',
            value: latestWeight
              ? `${weightDisplay(latestWeight.weight_kg, data.settings.unit)} ${data.settings.unit}`
              : '—'
          }
        ].map(item => (
          <Card key={item.key} gap="sm">
            <Text color="muted">{t(`dashboard.${item.key}`)}</Text>
            <Text size="3xl" weight="semibold">
              {item.value}
            </Text>
          </Card>
        ))}
      </Grid>
      <Grid gap="sm" templateCols={{ base: 1, sm: 2, lg: 7 }}>
        {[1, 2, 3, 4, 5, 6, 0].map(weekday => (
          <Card key={weekday} gap="sm">
            <Text weight="semibold">{dayjs().day(weekday).format('ddd')}</Text>
            <Text color="muted">
              {data.routines.find(
                routine =>
                  routine.id ===
                  data.schedule.find(item => item.weekday === weekday)
                    ?.routine_id
              )?.name ?? t('plan.restDay')}
            </Text>
          </Card>
        ))}
      </Grid>
      {data.active ? (
        <Card gap="md">
          <Text>{t('dashboard.activeHelp')}</Text>
          <Button icon="tabler:player-play" onClick={() => navigate('workout')}>
            resumeWorkout
          </Button>
        </Card>
      ) : (
        <StartWorkout routineId={routine?.id} />
      )}
      {latestWorkout && (
        <Card gap="md">
          <Text as="h3" size="xl">
            {t('dashboard.latestWorkout')}
          </Text>
          <Text>
            {latestWorkout.name} · {dayjs(latestWorkout.date).format('LL')}
          </Text>
          <Button
            variant="secondary"
            onClick={() => navigate('history', { workout: latestWorkout.id })}
          >
            details
          </Button>
        </Card>
      )}
    </Stack>
  )
}
