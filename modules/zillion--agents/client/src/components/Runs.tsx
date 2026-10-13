import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Grid, Stack, Text } from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'
import { forgeAPI } from '@/manifest'

import Result from './RunResult'

export default function Runs() {
  const { t } = useModuleTranslation(),
    { data, params, navigate } = useAgents()
  const filtered = data.runs.filter(
      r => !params.get('task') || r.task_id === params.get('task')
    ),
    requested = params.get('run'),
    recent = data.runs.find(r => r.id === requested)
  const validId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requested ?? ''
    )
  const archived = useQuery({
    queryKey: forgeAPI.run.get.input({ id: requested ?? '' }).key,
    queryFn: () => forgeAPI.run.get.input({ id: requested! }).query(),
    enabled: validId && !recent,
    staleTime: 0,
    refetchInterval: 10000
  })
  const selected = requested ? (recent ?? archived.data) : filtered[0]

  return (
    <Stack gap="lg">
      <Flex align="center" gap="sm" justify="between">
        <Text as="h2" size="xl" weight="semibold">
          {t('sections.runs')}
        </Text>
        {params.get('task') && (
          <Button
            namespace={false}
            variant="plain"
            onClick={() => navigate({ task: null, run: null })}
          >
            {t('allRuns')}
          </Button>
        )}
      </Flex>
      <Grid
        align="start"
        gap="lg"
        templateCols={{ base: 1, lg: 'minmax(0, 1fr) minmax(0, 1.5fr)' }}
      >
        <Stack gap="md">
          {filtered.map(run => (
            <Card
              key={run.id}
              isInteractive
              aria-pressed={selected?.id === run.id}
              as="button"
              gap="sm"
              onClick={() => navigate({ run: run.id })}
            >
              <Text align="left" weight="semibold">
                {run.task_title}
              </Text>
              <Text
                align="left"
                color={run.status === 'review' ? 'primary' : 'muted'}
                size="sm"
              >
                {data.principals.find(p => p.id === run.principal_id)?.name} ·{' '}
                {t('runStates.' + run.status)}
              </Text>
              <Text align="left" color="muted" size="sm">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short'
                }).format(dayjs(run.created).valueOf())}
              </Text>
            </Card>
          ))}
          {!filtered.length && (
            <Card>
              <Text color="muted">{t('noRuns')}</Text>
            </Card>
          )}
        </Stack>
        {selected && <Result key={selected.id} run={selected} />}
        {requested && !selected && (
          <Card role={validId && archived.isPending ? 'status' : 'alert'}>
            <Text color="muted">
              {validId && archived.isPending
                ? t('loading')
                : t('runUnavailable')}
            </Text>
          </Card>
        )}
      </Grid>
      <Card gap="md">
        <Text as="h2" size="xl" weight="semibold">
          {t('activity')}
        </Text>
        <Stack gap="md" maxHeight="28rem" overflowY="auto">
          {data.activity
            .filter(
              e => !params.get('task') || e.task_id === params.get('task')
            )
            .map(e => (
              <Flex
                key={e.id}
                direction={{ base: 'column', md: 'row' }}
                gap="sm"
              >
                <Stack flex="1">
                  <Text weight="medium">
                    {data.principals.find(p => p.id === e.actor_id)?.kind ===
                    'human'
                      ? t('you')
                      : data.principals.find(p => p.id === e.actor_id)
                          ?.name}{' '}
                    ·{' '}
                    {t('actions.' + e.action.split('.').join('_'), {
                      defaultValue: e.action
                    })}
                  </Text>
                  {e.message && (
                    <Text color="muted" whiteSpace="pre-wrap">
                      {e.message}
                    </Text>
                  )}
                </Stack>
                <Text color="muted" size="sm">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  }).format(dayjs(e.created).valueOf())}
                </Text>
              </Flex>
            ))}
        </Stack>
      </Card>
    </Stack>
  )
}
