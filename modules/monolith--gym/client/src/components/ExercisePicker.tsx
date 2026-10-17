import { useDeferredValue, useMemo, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Grid, Stack, Text, TextInput } from '@monolith/ui'

import { useGym } from '@/GymContext'

import type { Exercise } from '../../../shared'
import {
  exerciseEquipment,
  indexExercises,
  searchExercises
} from '../utils/exerciseSearch'
import { SelectInput } from './SelectInput'

export function ExercisePicker({
  onPick
}: {
  onPick: (exercise: Exercise) => void
}) {
  const { data } = useGym()
  const { t } = useModuleTranslation()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [shown, setShown] = useState(30)
  const deferredSearch = useDeferredValue(search)

  const searching = search !== deferredSearch
  const exercises = data?.exercises ?? []

  const index = useMemo(() => indexExercises(exercises), [exercises])

  const muscles = useMemo(
    () =>
      [
        ...new Set(
          exercises
            .filter(exercise => !exercise.archived)
            .map(exercise => exercise.muscle_group)
        )
      ].sort(),
    [exercises]
  )
  const base = useMemo(
    () => searchExercises(index, { search: deferredSearch, muscle }),
    [index, muscle, deferredSearch]
  )

  const equipmentOptions = useMemo(() => exerciseEquipment(base), [base])

  const results = useMemo(
    () =>
      base.filter(exercise => !equipment || exercise.equipment === equipment),
    [base, equipment]
  )

  const resultCards = useMemo(
    () =>
      results.slice(0, shown).map(exercise => (
        <Card
          key={exercise.id}
          align="center"
          direction="row"
          gap="md"
          justify="between"
          p="md"
        >
          <Stack>
            <Text weight="semibold">{exercise.name}</Text>
            <Text color="muted">
              {t(`muscles.${exercise.muscle_group}`)} ·{' '}
              {exercise.equipment || t('library.bodyweight')}
            </Text>
          </Stack>
          <Button
            icon="tabler:plus"
            variant="secondary"
            onClick={() => onPick(exercise)}
          >
            addExercise
          </Button>
        </Card>
      )),
    [results, shown, t, onPick]
  )

  return (
    <Stack gap="md">
      <TextInput
        icon="tabler:search"
        label="inputs.search"
        placeholder=""
        value={search}
        onChange={value => {
          setSearch(value)
          setEquipment('')
          setShown(30)
        }}
      />
      <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
        <SelectInput
          label="inputs.muscle"
          options={[
            { value: '', label: t('filters.allMuscles') },
            ...muscles.map(value => ({ value, label: t(`muscles.${value}`) }))
          ]}
          value={muscle}
          onChange={value => {
            setMuscle(value)
            setEquipment('')
            setShown(30)
          }}
        />
        <SelectInput
          label="inputs.equipment"
          options={[
            { value: '', label: t('filters.allEquipment') },
            ...equipmentOptions.map(value => ({ value, label: value }))
          ]}
          value={equipment}
          onChange={value => {
            setEquipment(value)
            setShown(30)
          }}
        />
      </Grid>
      <Text aria-busy={searching} color="muted" role="status">
        {t('library.matches', { count: results.length })}
      </Text>
      <Stack aria-busy={searching} maxHeight="28rem" overflowY="auto">
        {resultCards}
        {!results.length && <Text>{t('messages.noResults')}</Text>}
      </Stack>
      {results.length > shown && (
        <Button
          variant="secondary"
          onClick={() => setShown(value => value + 30)}
        >
          showMore
        </Button>
      )}
      {(search || muscle || equipment) && (
        <Flex>
          <Button
            variant="plain"
            onClick={() => {
              setSearch('')
              setMuscle('')
              setEquipment('')
              setShown(30)
            }}
          >
            resetFilters
          </Button>
        </Flex>
      )}
    </Stack>
  )
}
