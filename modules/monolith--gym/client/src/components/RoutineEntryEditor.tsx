import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text } from '@monolith/ui'

import { useGym } from '@/GymContext'

import type { RoutineEntry } from '../../../shared'
import { PrescriptionEditor } from './PrescriptionEditor'

export function RoutineEntryEditor({
  entry,
  index,
  length,
  onChange,
  onMove,
  onLink,
  onRemove,
  linked
}: {
  entry: RoutineEntry
  index: number
  length: number
  onChange: (entry: RoutineEntry) => void
  onMove: (direction: number) => void
  onLink: () => void
  onRemove: () => void
  linked: boolean
}) {
  const { data } = useGym()
  const { t } = useModuleTranslation()

  const exercise = data?.exercises.find(
    exercise => exercise.id === entry.exercise_id
  )

  return (
    <Card as="section" gap="md">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack>
          <Text as="h3" size="lg" weight="semibold">
            {index + 1}. {exercise?.name ?? t('messages.unknownExercise')}
          </Text>
          {entry.superset_group && (
            <Text color="primary">{t('workout.superset')}</Text>
          )}
        </Stack>
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={index === 0}
            icon="tabler:arrow-up"
            variant="secondary"
            onClick={() => onMove(-1)}
          >
            moveUp
          </Button>
          <Button
            disabled={index === length - 1}
            icon="tabler:arrow-down"
            variant="secondary"
            onClick={() => onMove(1)}
          >
            moveDown
          </Button>
          {index > 0 && (
            <Button
              aria-pressed={linked}
              icon="tabler:link"
              variant={linked ? 'primary' : 'secondary'}
              onClick={onLink}
            >
              superset
            </Button>
          )}
          <Button
            dangerous
            icon="tabler:trash"
            variant="plain"
            onClick={onRemove}
          >
            remove
          </Button>
        </Flex>
      </Flex>
      <PrescriptionEditor
        unit={data?.settings.unit ?? 'kg'}
        value={entry.prescription}
        onChange={prescription => onChange({ ...entry, prescription })}
      />
    </Card>
  )
}
