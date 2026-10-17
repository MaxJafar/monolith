import dayjs from 'dayjs'
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import { type Exercise, prescriptionSchema } from '../../../shared'
import { ExerciseEditor } from '../components/ExerciseEditor'
import { SelectInput } from '../components/SelectInput'
import {
  exerciseEquipment,
  indexExercises,
  searchExercises
} from '../utils/exerciseSearch'
import { weightDisplay } from '../utils/workout'

export default function LibraryView() {
  const { data, run, pending, navigate } = useGym()
  const { t } = useModuleTranslation()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [customOnly, setCustomOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [shown, setShown] = useState(40)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [newExercise, setNewExercise] = useState(false)
  const [routineId, setRoutineId] = useState('')
  const deferredSearch = useDeferredValue(search)

  const searching = search !== deferredSearch

  const detailsRef = useRef<HTMLDivElement>(null)
  const detailsTrigger = useRef<HTMLButtonElement | null>(null)
  const detailPanelId = useId()

  const exercises = data?.exercises ?? []

  const index = useMemo(() => indexExercises(exercises), [exercises])

  const muscles = useMemo(
    () => [...new Set(exercises.map(exercise => exercise.muscle_group))].sort(),
    [exercises]
  )
  const catalogCount = useMemo(
    () => exercises.filter(exercise => !exercise.custom).length,
    [exercises]
  )
  const base = useMemo(
    () =>
      searchExercises(index, {
        search: deferredSearch,
        muscle,
        customOnly,
        showArchived
      }),
    [index, deferredSearch, muscle, customOnly, showArchived]
  )

  const equipmentOptions = useMemo(() => exerciseEquipment(base), [base])

  const results = useMemo(
    () =>
      base.filter(exercise => !equipment || exercise.equipment === equipment),
    [base, equipment]
  )
  const selected = exercises.find(exercise => exercise.id === selectedId)
  const history = useMemo(
    () =>
      !selectedId
        ? []
        : (data?.workouts
            .filter(workout => workout.status === 'completed')
            .flatMap(workout =>
              workout.entries
                .filter(entry => entry.exercise_id === selectedId)
                .map(entry => ({ workout, entry }))
            ) ?? []),
    [data?.workouts, selectedId]
  )
  const last = useMemo(
    () =>
      history
        .slice()
        .sort((a, b) =>
          b.workout.started_at.localeCompare(a.workout.started_at)
        )[0],
    [history]
  )
  const best = useMemo(
    () =>
      history.reduce(
        (maximum, { entry }) =>
          entry.sets.reduce(
            (value, set) => (set.done ? Math.max(value, set.weight_kg) : value),
            maximum
          ),
        0
      ),
    [history]
  )

  useEffect(() => {
    if (selectedId) detailsRef.current?.focus()
  }, [selectedId])

  const resultCards = useMemo(
    () =>
      results.slice(0, shown).map(exercise => (
        <Card key={exercise.id} gap="sm">
          <Flex align="center" gap="sm">
            <Icon
              color="primary"
              icon={
                exercise.mode === 'cardio'
                  ? 'tabler:run'
                  : exercise.mode === 'time'
                    ? 'tabler:hourglass'
                    : 'tabler:barbell'
              }
            />
            <Text weight="semibold">{exercise.name}</Text>
          </Flex>
          <Text color="muted">
            {t(`muscles.${exercise.muscle_group}`)} ·{' '}
            {exercise.equipment || t('library.bodyweight')}
          </Text>
          <Button
            aria-controls={
              selectedId === exercise.id ? detailPanelId : undefined
            }
            aria-expanded={selectedId === exercise.id}
            variant="secondary"
            onClick={event => {
              detailsTrigger.current = event.currentTarget
              setSelectedId(exercise.id)
              setEditing(false)
            }}
          >
            details
          </Button>
        </Card>
      )),
    [results, shown, selectedId, detailPanelId, t]
  )

  if (!data) return null

  async function addToRoutine(exercise: Exercise) {
    const routine = data!.routines.find(
      routine => routine.id === routineId && !routine.archived
    )

    if (!routine) return

    const entries = [
      ...routine.entries,
      {
        id: crypto.randomUUID(),
        exercise_id: exercise.id,
        superset_group: null,
        position: routine.entries.length,
        prescription: prescriptionSchema.parse({
          mode: exercise.mode,
          rest_seconds: data!.settings.rest_seconds
        })
      }
    ]

    if (
      await run(() =>
        workspaceAPI.updateRoutine
          .input({ id: routine.id })
          .mutate({ ...routine, entries, expected_revision: routine.revision })
      )
    )
      navigate('plan', { routine: routine.id })
  }
  if (newExercise || (editing && selected))
    return (
      <Card gap="md">
        <Text as="h2" size="xl">
          {t('library.customExercise')}
        </Text>
        <ExerciseEditor
          exercise={newExercise ? undefined : selected}
          onDone={() => {
            setEditing(false)
            setNewExercise(false)
          }}
        />
      </Card>
    )

  return (
    <Stack gap="lg">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Text as="h2" size="2xl" weight="semibold">
          {t('sections.library')}
        </Text>
        <Button icon="tabler:plus" onClick={() => setNewExercise(true)}>
          newExercise
        </Button>
      </Flex>
      <Text color="muted">
        {t('library.catalogInfo', {
          count: catalogCount
        })}
      </Text>
      <TextInput
        icon="tabler:search"
        label="inputs.search"
        placeholder=""
        value={search}
        onChange={value => {
          setSearch(value)
          setEquipment('')
          setShown(40)
        }}
      />
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
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
            setShown(40)
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
            setShown(40)
          }}
        />
      </Grid>
      <Flex gap="md" wrap="wrap">
        <Checkbox
          checked={customOnly}
          label={t('library.customOnly')}
          onCheckedChange={setCustomOnly}
        />
        <Checkbox
          checked={showArchived}
          label={t('library.showArchived')}
          onCheckedChange={setShowArchived}
        />
        <Button
          variant="plain"
          onClick={() => {
            setSearch('')
            setMuscle('')
            setEquipment('')
            setCustomOnly(false)
            setShowArchived(false)
            setShown(40)
          }}
        >
          resetFilters
        </Button>
      </Flex>
      {selected && (
        <Card
          ref={detailsRef}
          aria-label={selected.name}
          gap="md"
          id={detailPanelId}
          role="region"
          tabIndex={-1}
        >
          <Flex align="center" gap="md" justify="between">
            <Text as="h3" size="xl" weight="semibold">
              {selected.name}
            </Text>
            <Button
              icon="tabler:x"
              variant="plain"
              onClick={() => {
                setSelectedId(null)
                detailsTrigger.current?.focus()
              }}
            >
              close
            </Button>
          </Flex>
          <Text color="muted">
            {t(`modes.${selected.mode}`)} ·{' '}
            {t(`muscles.${selected.muscle_group}`)} ·{' '}
            {selected.equipment || t('library.bodyweight')}
          </Text>
          <Text whiteSpace="pre-line">
            {selected.instructions || t('library.noInstructions')}
          </Text>
          {last && (
            <Text>
              {t('library.last', {
                date: dayjs(last.workout.date).format('ll'),
                weight: weightDisplay(
                  Math.max(
                    0,
                    ...last.entry.sets
                      .filter(set => set.done)
                      .map(set => set.weight_kg)
                  ),
                  data.settings.unit
                ),
                unit: data.settings.unit
              })}
            </Text>
          )}
          {best > 0 && (
            <Text color="primary">
              {t('library.best', {
                weight: weightDisplay(best, data.settings.unit),
                unit: data.settings.unit
              })}
            </Text>
          )}
          <Flex gap="sm" wrap="wrap">
            <Button
              variant="secondary"
              onClick={() => navigate('stats', { exercise: selected.id })}
            >
              calculator
            </Button>
            {selected.custom && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                edit
              </Button>
            )}
            {selected.custom && (
              <Button
                dangerous={!selected.archived}
                disabled={pending}
                variant="secondary"
                onClick={() => {
                  if (
                    selected.archived ||
                    window.confirm(t('messages.archiveExercise'))
                  )
                    void run(() =>
                      workspaceAPI.archiveExercise
                        .input({ id: selected.id })
                        .mutate({
                          expected_revision: selected.revision,
                          archived: !selected.archived
                        })
                    )
                }}
              >
                {selected.archived ? 'restore' : 'archive'}
              </Button>
            )}
          </Flex>
          {!selected.archived && (
            <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
              <SelectInput
                label="inputs.routine"
                options={[
                  { value: '', label: t('messages.chooseRoutine') },
                  ...data.routines
                    .filter(routine => !routine.archived)
                    .map(routine => ({
                      value: routine.id,
                      label: routine.name
                    }))
                ]}
                value={routineId}
                onChange={setRoutineId}
              />
              <Button
                disabled={!routineId || pending}
                icon="tabler:plus"
                onClick={() => void addToRoutine(selected)}
              >
                addToRoutine
              </Button>
            </Grid>
          )}
        </Card>
      )}
      <Text aria-busy={searching} color="muted" role="status">
        {t('library.matches', { count: results.length })}
      </Text>
      <Grid
        aria-busy={searching}
        gap="md"
        templateCols={{ base: 1, md: 2, xl: 3 }}
      >
        {resultCards}
      </Grid>
      {!results.length && (
        <Card>
          <Text>{t('messages.noResults')}</Text>
        </Card>
      )}
      {results.length > shown && (
        <Button
          variant="secondary"
          onClick={() => setShown(value => value + 40)}
        >
          showMore
        </Button>
      )}
    </Stack>
  )
}
