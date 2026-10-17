import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text, TextAreaInput } from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import { CoachConfigEditor } from '../components/CoachConfigEditor'
import { CoachProposalReview } from '../components/CoachProposalReview'

export default function CoachView() {
  const { run, pending, ownerId } = useGym()
  const { t } = useModuleTranslation()
  const [feedback, setFeedback] = useState('')

  const query = useQuery(
    workspaceAPI.coach.queryOptions({
      queryKey: [...workspaceAPI.coach.key, ownerId],
      enabled: !!ownerId,
      refetchInterval: 15000
    })
  )

  const data = query.data

  return (
    <Stack gap="lg">
      <Flex gap="md" justify="between" wrap="wrap">
        <Text as="h2" size="2xl" weight="semibold">
          {t('sections.coach')}
        </Text>
        <Button
          icon="tabler:refresh"
          variant="secondary"
          onClick={() => void query.refetch()}
        >
          refresh
        </Button>
      </Flex>
      <Card gap="md">
        <Text>{t('coach.description')}</Text>
        <Text color="muted">{t('coach.workerRequirement')}</Text>
        <Button as="a" href="/agents" icon="tabler:robot" variant="secondary">
          manageAgents
        </Button>
      </Card>
      {query.isFetching && !data && (
        <Text role="status">{t('coach.loading')}</Text>
      )}
      {query.error && (
        <Text color="dangerous" role="alert">
          {query.error.message}
        </Text>
      )}
      {data && (
        <>
          <CoachConfigEditor agents={data.agents} config={data.config} />
          <Card gap="md">
            <TextAreaInput
              icon="tabler:message"
              label="coach.feedback"
              placeholder=""
              value={feedback}
              onChange={setFeedback}
            />
            <Flex gap="md" wrap="wrap">
              <Button
                disabled={!data.config.enabled || pending}
                onClick={() =>
                  void run(() =>
                    workspaceAPI.requestCoachReview.mutate({
                      request_id: crypto.randomUUID(),
                      kind: 'create',
                      feedback
                    })
                  )
                }
              >
                createCoachPlan
              </Button>
              <Button
                disabled={!data.config.enabled || pending}
                variant="secondary"
                onClick={() =>
                  void run(() =>
                    workspaceAPI.requestCoachReview.mutate({
                      request_id: crypto.randomUUID(),
                      kind: 'review',
                      feedback
                    })
                  )
                }
              >
                reviewCoachPlan
              </Button>
              <Button
                disabled={!data.can_revert || pending}
                variant="plain"
                onClick={() => {
                  if (window.confirm(t('coach.confirmRevert')))
                    void run(() =>
                      workspaceAPI.revertCoachProposal.mutate(undefined)
                    )
                }}
              >
                revertCoachPlan
              </Button>
            </Flex>
            <Text color="muted">{t('coach.revertExplanation')}</Text>
          </Card>
          {data.jobs.length === 0 && (
            <Card>
              <Text color="muted">{t('coach.empty')}</Text>
            </Card>
          )}
          {data.jobs.map(job => (
            <CoachProposalReview
              key={job.id}
              currentHash={data.plan_hash}
              feedback={feedback}
              job={job}
            />
          ))}
        </>
      )}
    </Stack>
  )
}
