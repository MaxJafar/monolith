import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text, TextAreaInput } from '@monolith/ui'

import { useAgents } from '@/AgentContext'
import { workspaceAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import type { Run } from '../../../shared'

export default function Result({ run }: { run: Run }) {
  const { t } = useModuleTranslation(),
    { data, act, busy, navigate } = useAgents(),
    [note, setNote] = useState('')

  const guard = useDraftGuard(Boolean(note))

  async function decide(approve: boolean) {
    if (
      await act(() =>
        workspaceAPI.run.review.input({ id: run.id }).mutate({ approve, note })
      )
    ) {
      setNote('')
    }
  }

  return (
    <Stack gap="md">
      <DraftNotice blocker={guard.blocker} />
      <Card gap="md">
        <Text as="h3" size="xl" weight="semibold">
          {run.task_title}
        </Text>
        <Text color="muted">
          {data.principals.find(p => p.id === run.principal_id)?.name} ·{' '}
          {t('runStates.' + run.status)}
        </Text>
        <Text color="muted" size="sm">
          {t('runCost', {
            reserved: run.estimated_cents,
            cost: run.cost_cents
          })}
        </Text>
        {run.status === 'queued' &&
          (data.principals.find(p => p.id === run.principal_id)?.adapter ===
          'planner' ? (
            <Button
              disabled={busy}
              icon="tabler:player-play"
              namespace={false}
              onClick={() => {
                void act(() =>
                  workspaceAPI.run.plan.input({ id: run.id }).mutate(undefined)
                )
              }}
            >
              {t('runPlanner')}
            </Button>
          ) : (
            <Stack>
              <Text color="muted">{t('externalWaiting')}</Text>
              <Button
                namespace={false}
                variant="secondary"
                onClick={() =>
                  navigate({ section: 'people', person: run.principal_id })
                }
              >
                {t('workerConnection')}
              </Button>
            </Stack>
          ))}
        {run.status === 'running' && (
          <Text role="status">
            {t('heartbeat', {
              date: run.heartbeat_at
                ? new Intl.DateTimeFormat(undefined, {
                    timeStyle: 'medium'
                  }).format(dayjs(run.heartbeat_at).valueOf())
                : '—'
            })}
          </Text>
        )}
        {run.result && (
          <Card
            bg={{ base: 'bg-100', dark: 'bg-950' }}
            maxHeight="32rem"
            overflowY="auto"
          >
            <Text
              as="pre"
              className="zillion-agent-content"
              size="sm"
              whiteSpace="pre-wrap"
            >
              {run.result}
            </Text>
          </Card>
        )}
        {run.error && <Text color="dangerous">{run.error}</Text>}
        {run.playbooks.length > 0 && (
          <Stack gap="sm">
            <Text weight="semibold">{t('playbooks.runPolicy')}</Text>
            <Text color="muted" size="sm">
              {t('playbooks.evidenceHint')}
            </Text>
            {run.playbooks.map(book => (
              <Card key={book.id} gap="sm">
                <Text weight="semibold">
                  {book.name} ·{' '}
                  {t('playbooks.revision', { revision: book.revision })}
                </Text>
                {book.require_review && (
                  <Text size="sm">{t('playbooks.reviewRequired')}</Text>
                )}
                {book.checks.map((check, index) => {
                  const evidence = run.quality_report.find(
                    item => item.check_id === `${book.id}:${index}`
                  )

                  return (
                    <Stack key={index} gap="xs">
                      <Text size="sm">
                        {evidence?.passed ? '✓' : '○'} {check}
                      </Text>
                      <Text
                        color="muted"
                        overflowWrap="anywhere"
                        size="sm"
                        whiteSpace="pre-wrap"
                      >
                        {evidence?.evidence ?? t('playbooks.pendingEvidence')}
                      </Text>
                    </Stack>
                  )
                })}
              </Card>
            ))}
          </Stack>
        )}
        {run.decision_note && (
          <Text whiteSpace="pre-wrap">{run.decision_note}</Text>
        )}
        {run.status === 'review' && (
          <Stack>
            <Text color="muted">{t('reviewHint')}</Text>
            <TextAreaInput
              disabled={busy}
              icon="tabler:message"
              label="inputs.decision"
              placeholder={t('decisionHint')}
              value={note}
              onChange={setNote}
            />
            <Flex gap="sm" wrap="wrap">
              <Button
                disabled={busy}
                icon="tabler:checks"
                namespace={false}
                onClick={() => {
                  void decide(true)
                }}
              >
                {t('approve')}
              </Button>
              <Button
                dangerous
                disabled={busy}
                namespace={false}
                variant="secondary"
                onClick={() => {
                  void decide(false)
                }}
              >
                {t('reject')}
              </Button>
            </Flex>
          </Stack>
        )}
        {['queued', 'running', 'review'].includes(run.status) && (
          <Button
            dangerous
            disabled={busy}
            namespace={false}
            variant="plain"
            onClick={() => {
              void act(() =>
                workspaceAPI.run.cancel.input({ id: run.id }).mutate(undefined)
              )
            }}
          >
            {t('cancelRun')}
          </Button>
        )}
        <Button
          namespace={false}
          variant="secondary"
          onClick={() =>
            navigate({ section: 'work', task: run.task_id, run: null })
          }
        >
          {t('openAssignment')}
        </Button>
      </Card>
    </Stack>
  )
}
