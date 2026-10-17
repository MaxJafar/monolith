import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Grid, Stack, Text } from '@monolith/ui'

import { useAgents } from '@/AgentContext'
import Select from '@/Select'
import { workspaceAPI } from '@/manifest'

import UsageAnalytics from './UsageAnalytics'

const number = (value: number) => new Intl.NumberFormat().format(value)
const money = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(value / 100)

export default function Usage() {
  const { t } = useModuleTranslation(),
    { data, params, navigate } = useAgents()
  const agent = params.get('usageAgent') ?? '',
    month = params.get('month') ?? ''
  const offset = Math.max(
    0,
    Math.min(1000000, Math.floor(Number(params.get('offset')) || 0))
  )
  const input = {
    offset,
    limit: 50,
    ...(agent ? { principal_id: agent } : {}),
    ...(/^20\d{2}-(0[1-9]|1[0-2])$/.test(month) ? { month } : {})
  }
  const query = useQuery({
    queryKey: workspaceAPI.metering.list.input(input).key,
    queryFn: () => workspaceAPI.metering.list.input(input).query(),
    staleTime: 0,
    refetchInterval: 10000
  })
  const totals = query.data?.totals

  return (
    <Stack gap="lg">
      <Text as="h2" size="xl" weight="semibold">
        {t('sections.usage')}
      </Text>
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <Select
          label="inputs.agent"
          options={[
            { value: '', label: t('metering.allAgents') },
            ...data.principals
              .filter(p => p.kind === 'agent')
              .map(p => ({ value: p.id, label: p.name }))
          ]}
          value={agent}
          onChange={usageAgent =>
            navigate({ usageAgent: usageAgent || null, offset: null })
          }
        />
        <Select
          label="inputs.usageMonth"
          options={[
            { value: '', label: t('metering.allTime') },
            ...Array.from({ length: 24 }, (_, i) => {
              const value = dayjs().subtract(i, 'month').format('YYYY-MM')

              return { value, label: value }
            })
          ]}
          value={month}
          onChange={month => navigate({ month: month || null, offset: null })}
        />
      </Grid>
      <Text color="muted">{t('metering.hint')}</Text>
      {query.error && (
        <Card role="alert">
          <Text color="dangerous">{String(query.error)}</Text>
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => {
              void query.refetch()
            }}
          >
            {t('refresh')}
          </Button>
        </Card>
      )}
      {query.isPending ? (
        <Text role="status">{t('loading')}</Text>
      ) : (
        totals && (
          <>
            <Grid gap="md" templateCols={{ base: 2, lg: 4 }}>
              {[
                [t('metering.total'), number(totals.total_tokens)],
                [t('metering.input'), number(totals.input_tokens)],
                [t('metering.output'), number(totals.output_tokens)],
                [t('metering.cost'), money(totals.cost_cents)]
              ].map(([label, value]) => (
                <Card key={label} gap="sm">
                  <Text color="muted" size="sm">
                    {label}
                  </Text>
                  <Text size="2xl" weight="semibold">
                    {value}
                  </Text>
                </Card>
              ))}
            </Grid>
            <UsageAnalytics rows={query.data?.rows ?? []} totals={totals} />
            <Text color="muted" size="sm">
              {t('metering.coverage', {
                known: totals.metered_runs,
                total: totals.runs,
                cached: number(totals.cached_input_tokens)
              })}
            </Text>
            <Stack gap="md">
              {query.data?.rows.map(row => (
                <Card key={row.id} gap="sm">
                  <Flex align="start" gap="sm" justify="between" wrap="wrap">
                    <Stack flex="1">
                      <Text weight="semibold">{row.task_title}</Text>
                      <Text color="muted" size="sm">
                        {
                          data.principals.find(p => p.id === row.principal_id)
                            ?.name
                        }{' '}
                        {(row.adapter !== 'external' ||
                          row.total_tokens !== null) && (
                          <>· {t('adapters.' + row.adapter)} </>
                        )}
                        · {t('runStates.' + row.status)}
                      </Text>
                    </Stack>
                    {row.run_id && (
                      <Button
                        icon="tabler:arrow-up-right"
                        namespace={false}
                        variant="plain"
                        onClick={() =>
                          navigate({
                            section: 'runs',
                            run: row.run_id,
                            task: null
                          })
                        }
                      >
                        {t('metering.openRun')}
                      </Button>
                    )}
                  </Flex>
                  <Text size="sm">
                    {row.total_tokens === null
                      ? t('metering.unknown')
                      : t('metering.counts', {
                          input: number(row.input_tokens ?? 0),
                          cached: number(row.cached_input_tokens ?? 0),
                          output: number(row.output_tokens ?? 0),
                          total: number(row.total_tokens)
                        })}
                  </Text>
                  <Text color="muted" size="sm">
                    {row.model
                      ? `${row.provider} · ${row.model}`
                      : t('metering.noModel')}{' '}
                    · {money(row.cost_cents)} ·{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    }).format(dayjs(row.created).valueOf())}
                  </Text>
                  {row.reported_cost_cents !== null &&
                    row.reported_cost_cents > row.cost_cents && (
                      <Text color="dangerous" size="sm">
                        {t('metering.overrun', {
                          cost: money(row.reported_cost_cents)
                        })}
                      </Text>
                    )}
                  {row.session_id && (
                    <Text color="muted" overflowWrap="anywhere" size="sm">
                      {t('metering.session', { id: row.session_id })}
                    </Text>
                  )}
                  {!row.run_id && (
                    <Text color="muted" size="sm">
                      {t('metering.retained')}
                    </Text>
                  )}
                </Card>
              ))}
              {!query.data?.rows.length && (
                <Card>
                  <Text color="muted">{t('metering.empty')}</Text>
                </Card>
              )}
            </Stack>
            <Flex gap="sm" justify="between">
              <Button
                disabled={offset === 0 || query.isFetching}
                namespace={false}
                variant="secondary"
                onClick={() =>
                  navigate({ offset: String(Math.max(0, offset - 50)) })
                }
              >
                {t('metering.previous')}
              </Button>
              <Text color="muted" size="sm">
                {t('metering.page', { page: Math.floor(offset / 50) + 1 })}
              </Text>
              <Button
                disabled={!query.data?.has_more || query.isFetching}
                namespace={false}
                variant="secondary"
                onClick={() => navigate({ offset: String(offset + 50) })}
              >
                {t('metering.next')}
              </Button>
            </Flex>
          </>
        )
      )}
    </Stack>
  )
}
