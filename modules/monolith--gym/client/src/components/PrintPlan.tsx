import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Card, Stack, Text } from '@monolith/ui'

import { useGym } from '@/GymContext'

import { weightDisplay } from '../utils/workout'

export function PrintPlan() {
  const { data } = useGym()
  const { t } = useModuleTranslation()
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!sheet) return
    document.body.appendChild(sheet)
    const finish = () => setSheet(null)
    window.addEventListener('afterprint', finish)
    let secondFrame = 0

    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => window.print())
    })

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(secondFrame)
      window.removeEventListener('afterprint', finish)
      sheet.remove()
    }
  }, [sheet])

  return (
    <>
      <Button
        disabled={!data || !!sheet}
        icon="tabler:printer"
        variant="secondary"
        onClick={() => {
          const element = document.createElement('div')
          element.className = 'zillion-gym-print-sheet'
          setSheet(element)
        }}
      >
        printPlan
      </Button>
      {sheet &&
        data &&
        createPortal(
          <Stack gap="lg" p="lg">
            <Text as="h1" size="3xl" weight="semibold">
              Monolith · {t('sections.plan')}
            </Text>
            <Box as="section">
              <Text as="h2" size="xl">
                {t('plan.weeklySchedule')}
              </Text>
              {[1, 2, 3, 4, 5, 6, 0].map(weekday => (
                <Text key={weekday}>
                  {dayjs().day(weekday).format('dddd')} ·{' '}
                  {data.routines.find(
                    routine =>
                      routine.id ===
                      data.schedule.find(item => item.weekday === weekday)
                        ?.routine_id
                  )?.name ?? t('plan.restDay')}
                </Text>
              ))}
            </Box>
            {data.schedule.some(item => item.date !== null) && (
              <Box as="section">
                <Text as="h2" size="xl">
                  {t('plan.dateOverrides')}
                </Text>
                {data.schedule
                  .filter(item => item.date !== null)
                  .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
                  .map(item => (
                    <Text key={item.id}>
                      {item.date} ·{' '}
                      {data.routines.find(
                        routine => routine.id === item.routine_id
                      )?.name ?? t('plan.restDay')}
                    </Text>
                  ))}
              </Box>
            )}
            {data.routines
              .filter(routine => !routine.archived)
              .map(routine => (
                <Card key={routine.id} as="section" gap="md">
                  <Text as="h2" size="2xl" weight="semibold">
                    {routine.name}
                  </Text>
                  <Text>{t(`progression.${routine.progression}`)}</Text>
                  <Text whiteSpace="pre-line">{routine.notes}</Text>
                  {routine.entries.map(entry => (
                    <Stack key={entry.id} gap="xs">
                      <Text weight="semibold">
                        {data.exercises.find(
                          exercise => exercise.id === entry.exercise_id
                        )?.name ?? t('messages.unknownExercise')}
                        {entry.superset_group
                          ? ` · ${t('workout.superset')}`
                          : ''}
                      </Text>
                      <Text>
                        {entry.prescription.sets} ×{' '}
                        {entry.prescription.mode === 'reps'
                          ? `${entry.prescription.reps} ${t('inputs.reps')}`
                          : entry.prescription.mode === 'time'
                            ? `${entry.prescription.seconds} ${t('inputs.seconds')}`
                            : `${entry.prescription.minutes} ${t('inputs.minutes')} · ${entry.prescription.speed_kmh} km/h`}
                        {entry.prescription.mode !== 'cardio'
                          ? ` · ${weightDisplay(entry.prescription.weight_kg, data.settings.unit)} ${data.settings.unit}`
                          : ''}{' '}
                        · {t('inputs.rest_seconds')}:{' '}
                        {entry.prescription.rest_seconds}
                      </Text>
                    </Stack>
                  ))}
                </Card>
              ))}
          </Stack>,
          sheet
        )}
    </>
  )
}
