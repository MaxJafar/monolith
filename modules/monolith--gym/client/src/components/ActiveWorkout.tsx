import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { APIError } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Flex,
  Grid,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import {
  type Exercise,
  type Workout,
  type WorkoutEntry,
  exerciseInputSchema,
  prescriptionSchema,
  setSchema,
  workoutUpdateSchema
} from '../../../shared'
import { useWakeLock } from '../hooks/useWakeLock'
import { DraftNotice, useDraftGuard } from '../useDraftGuard'
import {
  type PendingWorkoutCommand,
  acknowledgeDraft,
  commandForDraft,
  mutableWorkout
} from '../utils/recovery'
import { playBeep } from '../utils/sound'
import {
  acknowledgedWorkTimer,
  adjacentGroups,
  cleanSupersets,
  restAfterSet
} from '../utils/workout'
import { ExercisePicker } from './ExercisePicker'
import { SessionClock } from './SessionClock'
import { WorkoutEntryCard } from './WorkoutEntryCard'
import { WorkoutTimers } from './WorkoutTimers'

export function ActiveWorkout({ workout }: { workout: Workout }) {
  const {
    data,
    pending,
    run,
    navigate,
    ownerId,
    offline,
    recovery,
    saveRecovery,
    clearRecovery
  } = useGym()

  const { t } = useModuleTranslation()

  const [source, setSource] = useState(() =>
    recovery?.draft.id === workout.id ? recovery.server : workout
  )
  const [draft, setDraft] = useState(() =>
    recovery?.draft.id === workout.id ? recovery.draft : workout
  )
  const [queued, setQueued] = useState<PendingWorkoutCommand | null>(() =>
    recovery?.draft.id === workout.id ? recovery.pending : null
  )

  const [syncError, setSyncError] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [picker, setPicker] = useState(false)
  const latestDraft = useRef(draft)

  latestDraft.current = draft

  const mutableDraft = useMemo(() => mutableWorkout(draft), [draft])

  const dirty = useMemo(
    () =>
      JSON.stringify(mutableDraft) !== JSON.stringify(mutableWorkout(source)),
    [mutableDraft, source]
  )
  const draftValid = useMemo(
    () => workoutUpdateSchema.safeParse(mutableDraft).success,
    [mutableDraft]
  )
  const { groups, completed, total } = useMemo(
    () => ({
      groups: adjacentGroups(draft.entries),
      completed: draft.entries.reduce(
        (count, entry) => count + entry.sets.filter(set => set.done).length,
        0
      ),
      total: draft.entries.reduce(
        (count, entry) => count + entry.sets.length,
        0
      )
    }),
    [draft.entries]
  )

  const { blocker, allowNavigation } = useDraftGuard(dirty)
  const wake = useWakeLock(data?.settings.keep_awake ?? false)

  useEffect(() => {
    if (!dirty && !queued && workout.revision !== source.revision) {
      setSource(workout)
      setDraft(workout)
      setQueued(null)
      setSyncError(false)
      setConflict(false)
    }
  }, [workout, source.revision, dirty, queued])
  useEffect(() => {
    if (ownerId)
      saveRecovery({
        owner_id: ownerId,
        server: source,
        draft,
        pending: queued,
        saved_at: dayjs().toISOString()
      })
  }, [ownerId, source, draft, queued, saveRecovery])
  useEffect(() => {
    if (!offline && !conflict) setSyncError(false)
  }, [offline, conflict])
  const workTimer = draft.work_timer
  const canCompleteTimer =
    acknowledgedWorkTimer(source.work_timer, workTimer) &&
    !pending &&
    !dirty &&
    !queued &&
    !conflict &&
    !offline
  const completeTimer = useCallback(async () => {
    if (!canCompleteTimer) return
    let result: Workout | undefined

    if (
      await run(async () => {
        result = await workspaceAPI.completeWorkTimer
          .input({ id: source.id })
          .mutate({
            command_id: crypto.randomUUID(),
            expected_revision: source.revision
          })
      })
    ) {
      if (result) {
        setSource(result)
        setDraft(result)
        playBeep(data?.settings.sound)
      }
    }
  }, [canCompleteTimer, run, source.id, source.revision, data?.settings.sound])
  const persist = useCallback(
    async (next: Workout): Promise<Workout | undefined> => {
      setDraft(next)

      if (
        !queued &&
        !workoutUpdateSchema.safeParse(mutableWorkout(next)).success
      ) {
        setSyncError(true)

        return undefined
      }

      const command = commandForDraft(next, source.revision, queued, () =>
        crypto.randomUUID()
      )
      setQueued(command)
      if (ownerId)
        saveRecovery({
          owner_id: ownerId,
          server: source,
          draft: next,
          pending: command,
          saved_at: dayjs().toISOString()
        })
      if (offline) return undefined
      let result: Workout | undefined
      let isConflict = false

      const success = await run(async () => {
        try {
          result = await workspaceAPI.updateWorkout
            .input({ id: source.id })
            .mutate({
              ...command.body,
              command_id: command.command_id,
              expected_revision: command.expected_revision
            })
        } catch (error) {
          isConflict = error instanceof APIError && error.status === 409
          throw error
        }
      })

      if (success && result) {
        const acknowledged = result
        setSource(acknowledged)
        setDraft(current => acknowledgeDraft(acknowledged, current, command))
        setQueued(null)
        setSyncError(false)
        setConflict(false)

        return acknowledged
      }
      setSyncError(true)
      setConflict(isConflict)

      return undefined
    },
    [source, queued, offline, ownerId, run, saveRecovery]
  )
  useEffect(() => {
    if (
      offline ||
      pending ||
      conflict ||
      syncError ||
      source.work_timer ||
      (!dirty && !queued) ||
      !draftValid
    )
      return

    const timeout = window.setTimeout(() => {
      void persist(latestDraft.current)
    }, 750)

    return () => window.clearTimeout(timeout)
  }, [
    draft,
    draftValid,
    dirty,
    queued,
    offline,
    pending,
    conflict,
    syncError,
    source.work_timer,
    persist
  ])
  if (!data) return null

  const current = Math.max(
    0,
    groups.findIndex(group =>
      group.some(entry => entry.id === draft.current_entry_id)
    )
  )
  const group = groups[current] ?? []

  function changeEntry(next: WorkoutEntry) {
    setDraft({
      ...draft,
      entries: draft.entries.map(entry => (entry.id === next.id ? next : entry))
    })
  }

  async function toggle(entryId: string, setId: string) {
    const next = {
      ...draft,
      entries: draft.entries.map(entry => ({
        ...entry,
        sets: entry.sets.map(set =>
          entry.id === entryId && set.id === setId
            ? { ...set, done: !set.done }
            : set
        )
      }))
    }
    const entry = next.entries.find(entry => entry.id === entryId)!
    const set = entry.sets.find(set => set.id === setId)!

    const rest = restAfterSet(
      group.map(item => next.entries.find(entry => entry.id === item.id)!),
      entryId,
      setId
    )

    if (rest > 0) next.rest_until = dayjs().add(rest, 'second').toISOString()

    const groupDone = group.every(item =>
      next.entries
        .find(entry => entry.id === item.id)!
        .sets.every(set => set.done)
    )

    if (groupDone && groups[current + 1]?.[0])
      next.current_entry_id = groups[current + 1]![0]!.id

    if (await persist(next)) {
      if (set.done) playBeep(data?.settings.sound)
    }
  }

  async function startTimer(entryId: string, setId: string) {
    const set = draft.entries
      .find(entry => entry.id === entryId)!
      .sets.find(set => set.id === setId)!
    await persist({
      ...draft,
      rest_until: null,
      work_timer: {
        entry_id: entryId,
        set_id: setId,
        started_at: dayjs().toISOString(),
        target_seconds: Math.max(1, Math.round(set.seconds))
      }
    })
  }

  async function finish() {
    if (completed === 0 || completed < total) {
      if (
        !window.confirm(t('messages.finishEarly', { done: completed, total }))
      )
        return
    }

    const saved = await persist({ ...draft, work_timer: null })

    if (!saved) return

    if (
      await run(() =>
        workspaceAPI.finishWorkout.input({ id: saved.id }).mutate({
          command_id: crypto.randomUUID(),
          expected_revision: saved.revision
        })
      )
    ) {
      clearRecovery()
      allowNavigation()
      navigate('history', { workout: saved.id, summary: '1' })
    }
  }

  function add(exercise: Exercise) {
    const target = prescriptionSchema.parse({
      mode: exercise.mode,
      rest_seconds: data!.settings.rest_seconds
    })
    const entry: WorkoutEntry = {
      id: crypto.randomUUID(),
      exercise_id: exercise.id,
      exercise: exerciseInputSchema.parse(exercise),
      position: draft.entries.length,
      superset_group: null,
      target,
      suggestion: {
        policy: target.mode === 'reps' ? 'linear' : 'off',
        kind: 'first',
        reason: 'baseline',
        misses: 0
      },
      sets: Array.from({ length: target.sets }, (_, position) =>
        setSchema.parse({
          id: crypto.randomUUID(),
          position,
          weight_kg: target.weight_kg,
          reps: target.reps,
          seconds: target.seconds,
          minutes: target.minutes,
          speed_kmh: target.speed_kmh
        })
      )
    }
    void persist({
      ...draft,
      current_entry_id: entry.id,
      entries: [...draft.entries, entry]
    })
    setPicker(false)
  }

  return (
    <Stack gap="lg">
      <DraftNotice recoverable blocker={blocker} />
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack>
          <Text as="h2" size="2xl" weight="semibold">
            {draft.name}
          </Text>
          <Flex align="center" gap="sm" wrap="wrap">
            <SessionClock startedAt={draft.started_at} />
            <Text aria-hidden="true">·</Text>
            <Text role="status">
              {t('workout.progress', { done: completed, total })}
            </Text>
          </Flex>
        </Stack>
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={
              offline ||
              !!draft.work_timer ||
              (!dirty && !queued) ||
              !draftValid
            }
            loading={pending}
            variant="secondary"
            onClick={() => void persist(draft)}
          >
            saveWorkout
          </Button>
          <Button
            disabled={
              offline ||
              pending ||
              !!draft.work_timer ||
              !!queued ||
              conflict ||
              !draftValid
            }
            icon="tabler:check"
            onClick={() => void finish()}
          >
            finishWorkout
          </Button>
          <Button
            dangerous
            disabled={pending || offline}
            variant="plain"
            onClick={() => {
              if (window.confirm(t('messages.discardWorkout')))
                void run(() =>
                  workspaceAPI.discardWorkout.input({ id: source.id }).mutate({
                    command_id: crypto.randomUUID(),
                    expected_revision: source.revision
                  })
                ).then(success => {
                  if (success) {
                    clearRecovery()
                    allowNavigation()
                    navigate('dashboard')
                  }
                })
            }}
          >
            discardWorkout
          </Button>
        </Flex>
      </Flex>
      {source.revision !== workout.revision && dirty && (
        <Card role="alert">
          <Text color="dangerous">{t('messages.staleDraft')}</Text>
          <Button
            variant="secondary"
            onClick={() => {
              if (window.confirm(t('messages.discardChanges'))) {
                setSource(workout)
                setDraft(workout)
                setQueued(null)
                setSyncError(false)
                setConflict(false)
              }
            }}
          >
            reloadDraft
          </Button>
        </Card>
      )}
      {(dirty || queued || syncError) && (
        <Card gap="md" role="status">
          <Text color={conflict ? 'dangerous' : 'muted'}>
            {t(
              conflict
                ? 'workout.syncConflict'
                : offline
                  ? 'workout.offlineDraft'
                  : syncError
                    ? 'workout.syncFailed'
                    : pending
                      ? 'workout.sending'
                      : 'workout.autosavePending'
            )}
          </Text>
          {(queued || syncError) && (
            <Button
              disabled={offline || pending || conflict}
              variant="secondary"
              onClick={() => {
                setSyncError(false)
                void persist(draft)
              }}
            >
              retryWorkout
            </Button>
          )}
          {conflict && (
            <Button
              disabled={pending}
              variant="secondary"
              onClick={() => {
                if (window.confirm(t('workout.rebaseConfirm'))) {
                  setSource(workout)
                  setDraft(current => ({
                    ...current,
                    revision: workout.revision
                  }))
                  setQueued(null)
                  setConflict(false)
                  setSyncError(false)
                }
              }}
            >
              reviewDraft
            </Button>
          )}
        </Card>
      )}
      <Text color="muted">{t(`workout.wake.${wake}`)}</Text>
      <WorkoutTimers
        canComplete={canCompleteTimer}
        pending={pending}
        restUntil={draft.rest_until}
        sound={data.settings.sound}
        workTimer={draft.work_timer}
        onComplete={completeTimer}
        onSkipRest={() => void persist({ ...draft, rest_until: null })}
      />
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <TextInput
          disabled={pending || !!draft.work_timer}
          icon="tabler:barbell"
          label="inputs.workoutName"
          placeholder=""
          value={draft.name}
          onChange={name => setDraft({ ...draft, name })}
        />
        <TextAreaInput
          disabled={pending || !!draft.work_timer}
          icon="tabler:notes"
          label="inputs.notes"
          placeholder=""
          value={draft.notes}
          onChange={notes => setDraft({ ...draft, notes })}
        />
      </Grid>
      {group.length > 1 && (
        <Card>
          <Text color="primary">{t('workout.supersetHelp')}</Text>
        </Card>
      )}
      {group.map(entry => (
        <WorkoutEntryCard
          key={entry.id}
          entry={entry}
          pending={pending || !!draft.work_timer}
          timerActive={!!draft.work_timer || offline}
          onChange={changeEntry}
          onRemove={() => {
            if (window.confirm(t('messages.removeExercise')))
              void persist({
                ...draft,
                current_entry_id: null,
                entries: cleanSupersets(
                  draft.entries.filter(current => current.id !== entry.id)
                )
              })
          }}
          onTimer={setId => {
            if (!offline) void startTimer(entry.id, setId)
          }}
          onToggle={setId => void toggle(entry.id, setId)}
        />
      ))}
      {!draft.entries.length && (
        <Card>
          <Text>{t('workout.emptyFreestyle')}</Text>
        </Card>
      )}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={pending || !!draft.work_timer || current <= 0}
          variant="secondary"
          onClick={() =>
            void persist({
              ...draft,
              current_entry_id: groups[current - 1]![0]!.id
            })
          }
        >
          previous
        </Button>
        <Text>
          {t('workout.groupProgress', {
            current: groups.length ? current + 1 : 0,
            total: groups.length
          })}
        </Text>
        <Button
          disabled={
            pending || !!draft.work_timer || current >= groups.length - 1
          }
          variant="secondary"
          onClick={() =>
            void persist({
              ...draft,
              current_entry_id: groups[current + 1]![0]!.id
            })
          }
        >
          next
        </Button>
        <Button
          disabled={
            pending || !!draft.work_timer || draft.entries.length >= 100
          }
          icon="tabler:plus"
          variant="secondary"
          onClick={() => setPicker(value => !value)}
        >
          addExercise
        </Button>
      </Flex>
      {picker && (
        <Card>
          <ExercisePicker onPick={add} />
        </Card>
      )}
    </Stack>
  )
}
