import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Checkbox, Flex, Stack, Text } from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import type { CoachChange, CoachSnapshot } from '../../../coachShared'
import { weightDisplay } from '../utils/workout'

export function CoachProposalReview({
  job,
  currentHash,
  feedback
}: {
  job: CoachSnapshot['jobs'][number]
  currentHash: string
  feedback: string
}) {
  const { data, run, pending } = useGym()
  const { t } = useModuleTranslation()
  const [selected, setSelected] = useState<string[]>([])

  const stale = job.plan_hash !== currentHash
  const editable = job.status === 'review' || job.status === 'approved'

  function details(change: CoachChange) {
    if (change.kind === 'schedule')
      return `${dayjs().day(change.weekday).format('dddd')}: ${data?.routines.find(item => item.id === change.routine_id)?.name ?? t('plan.restDay')}`

    const routine =
      change.kind === 'add-routine'
        ? change.routine
        : data?.routines.find(item => item.id === change.routine_id)
    const entries =
      change.kind === 'update-routine'
        ? change.patch.entries
        : change.kind === 'add-routine'
          ? change.routine.entries
          : undefined

    return (
      <Stack gap="sm">
        <Text weight="medium">
          {change.kind === 'update-routine'
            ? (change.patch.name ?? routine?.name)
            : routine?.name}
        </Text>
        {change.kind === 'update-routine' &&
          change.patch.notes !== undefined && (
            <Text whiteSpace="pre-wrap">{change.patch.notes}</Text>
          )}
        {change.kind === 'add-routine' && (
          <Text whiteSpace="pre-wrap">{change.routine.notes}</Text>
        )}
        {(change.kind === 'add-routine' ||
          (change.kind === 'update-routine' &&
            change.patch.progression !== undefined)) && (
          <Text>
            {t('inputs.progression')}:{' '}
            {t(
              `progression.${change.kind === 'add-routine' ? change.routine.progression : change.patch.progression}`
            )}
          </Text>
        )}
        {entries?.map(entry => (
          <Text key={entry.id}>
            {data?.exercises.find(exercise => exercise.id === entry.exercise_id)
              ?.name ?? entry.exercise_id}{' '}
            · {entry.prescription.sets} ×{' '}
            {entry.prescription.mode === 'reps'
              ? `${entry.prescription.reps} · ${weightDisplay(entry.prescription.weight_kg, data?.settings.unit ?? 'kg')} ${data?.settings.unit}`
              : entry.prescription.mode === 'time'
                ? `${entry.prescription.seconds} ${t('coach.seconds')}`
                : `${entry.prescription.minutes} ${t('coach.minutes')} · ${entry.prescription.speed_kmh} km/h`}
          </Text>
        ))}
        {change.kind === 'archive-routine' && (
          <Text color="dangerous">{t('coach.archiveExplanation')}</Text>
        )}
      </Stack>
    )
  }

  return (
    <Card gap="md">
      <Flex gap="md" justify="between" wrap="wrap">
        <Text as="h3" size="lg" weight="semibold">
          {t(`coach.kinds.${job.kind}`)}
        </Text>
        <Text color="muted">
          {dayjs(job.created).format('lll')} ·{' '}
          {t(`coach.statuses.${job.status}`)}
        </Text>
      </Flex>
      {job.error && (
        <Text color="dangerous" role="alert">
          {job.error}
        </Text>
      )}
      {job.proposal && (
        <>
          <Text whiteSpace="pre-wrap">{job.proposal.summary}</Text>
          {job.proposal.notes.map((note, index) => (
            <Text key={index} color="muted">
              {note}
            </Text>
          ))}
          {job.proposal.changes.map(change => (
            <Card
              key={change.id}
              bg={{ base: 'bg-100', dark: 'bg-800' }}
              gap="sm"
            >
              <Checkbox
                checked={
                  selected.includes(change.id) ||
                  job.applied_ids.includes(change.id)
                }
                disabled={!editable || stale || pending}
                label={t(`coach.changes.${change.kind}`)}
                onCheckedChange={checked =>
                  setSelected(values =>
                    checked
                      ? [...values, change.id]
                      : values.filter(id => id !== change.id)
                  )
                }
              />
              {details(change)}
              <Text color="muted" whiteSpace="pre-wrap">
                {change.reason}
              </Text>
            </Card>
          ))}
          {stale && editable && (
            <Text color="dangerous" role="status">
              {t('coach.stale')}
            </Text>
          )}
          <Flex gap="md" wrap="wrap">
            <Button
              disabled={!editable || stale || selected.length === 0 || pending}
              onClick={() =>
                void run(() =>
                  workspaceAPI.applyCoachProposal
                    .input({ id: job.id })
                    .mutate({ selected_ids: selected })
                )
              }
            >
              applyCoachChanges
            </Button>
            <Button
              disabled={!editable || pending}
              variant="secondary"
              onClick={() =>
                void run(() =>
                  workspaceAPI.requestCoachReview.mutate({
                    request_id: crypto.randomUUID(),
                    kind: 'refine',
                    feedback,
                    previous_job_id: job.id
                  })
                )
              }
            >
              refineCoachPlan
            </Button>
          </Flex>
        </>
      )}
      {['queued', 'running', 'review'].includes(job.status) && (
        <Button
          dangerous
          disabled={pending}
          variant="plain"
          onClick={() =>
            void run(() =>
              workspaceAPI.cancelCoachReview.input({ id: job.id }).mutate(undefined)
            )
          }
        >
          dismissCoachProposal
        </Button>
      )}
    </Card>
  )
}
