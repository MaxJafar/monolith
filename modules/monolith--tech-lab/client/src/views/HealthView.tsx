import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Grid, LineChart, Stack, Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { HealthBadge } from '@/components/HealthBadge'
import { SelectInput } from '@/components/SelectInput'
import { workspaceAPI } from '@/manifest'
import { latencyPoints, observedAvailability } from '@/utils/health'
import { sectionParams } from '@/utils/navigation'

export default function HealthView() {
  const { t } = useModuleTranslation()

  const { data, params, updateParams, healthByService, ownerId, pending, run } =
    useTechLab()
  const requestedId = params.get('service')
  const selected =
    data?.services.find(service => service.id === requestedId) ??
    (!requestedId
      ? (data?.services.find(service => service.monitor_kind !== 'none') ??
        data?.services[0])
      : undefined)
  const hoursText = params.get('hours') ?? '24'
  const hours = ['24', '168', '720'].includes(hoursText)
    ? Number(hoursText)
    : 24
  const id = selected?.id ?? ''
  const query = useQuery(
    workspaceAPI.history.input({ id, hours }).queryOptions({
      queryKey: [...workspaceAPI.history.key, ownerId, id, hours],
      enabled: !!ownerId && !!id,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: (data?.settings.auto_refresh_seconds ?? 30) * 1000,
      refetchIntervalInBackground: false
    })
  )

  if (!data) return null

  const health = selected ? healthByService.get(selected.id) : undefined
  const availability = observedAvailability(health)
  const points = latencyPoints(query.data?.checks ?? []).map(point => ({
    ...point,
    detail: t(`status.${point.detail}`)
  }))

  return (
    <Stack gap="lg">
      <Card gap="md">
        <Text as="h2" size="xl" weight="semibold">
          {t('health.title')}
        </Text>
        <Stack as="details" gap="sm">
          <Text as="summary" weight="medium">
            {t('health.configuration')}
          </Text>
          <Text color="muted">{t('health.monitorHelp')}</Text>
          <Text color="muted">{t('overview.collector')}</Text>
        </Stack>
      </Card>
      <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
        <SelectInput
          label="inputs.service"
          options={data.services.map(service => ({
            value: service.id,
            label: service.name
          }))}
          value={id}
          onChange={service => updateParams({ service })}
        />
        <SelectInput
          label="health.range"
          options={['24', '168', '720'].map(value => ({
            value,
            label: t(`health.ranges.${value}`)
          }))}
          value={String(hours)}
          onChange={hours => updateParams({ hours })}
        />
      </Grid>
      {requestedId && !selected && (
        <Card role="alert">
          <Text>{t('messages.notFound')}</Text>
        </Card>
      )}
      {!data.services.length && (
        <Card>
          <Text>{t('services.empty')}</Text>
        </Card>
      )}
      {selected && (
        <>
          <Card gap="md">
            <Flex align="center" gap="md" justify="between" wrap="wrap">
              <Text as="h3" size="xl" weight="semibold">
                {selected.name}
              </Text>
              <HealthBadge status={health?.status ?? 'unknown'} />
            </Flex>
            <Grid gap="md" templateCols={{ base: 1, sm: 3 }}>
              <Stack gap="xs">
                <Text color="muted">{t('health.observed24h')}</Text>
                <Text size="2xl" weight="semibold">
                  {availability === null
                    ? '—'
                    : `${availability.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
                </Text>
                <Text color="muted" size="sm">
                  {t('health.samples', {
                    count: health?.observed_24h.total ?? 0
                  })}
                </Text>
              </Stack>
              <Stack gap="xs">
                <Text color="muted">{t('health.latency')}</Text>
                <Text size="2xl" weight="semibold">
                  {health?.latest?.latency_ms === undefined ||
                  health?.latest?.latency_ms === null
                    ? '—'
                    : `${Math.round(health.latest.latency_ms)} ms`}
                </Text>
              </Stack>
              <Stack gap="xs">
                <Text color="muted">{t('health.failures')}</Text>
                <Text>
                  {t('health.failureCounts', {
                    down: health?.observed_24h.down ?? 0,
                    errors: health?.observed_24h.error ?? 0
                  })}
                </Text>
              </Stack>
            </Grid>
            <Text color="muted">{t('health.observedHelp')}</Text>
            {health?.latest && (
              <>
                <Text>{health.latest.message}</Text>
                <Text color="muted" size="sm">
                  {t('health.lastChecked', {
                    date: dayjs(health.latest.checked_at).format('lll')
                  })}
                  {health.latest.http_status !== null
                    ? ` · HTTP ${health.latest.http_status}`
                    : ''}
                </Text>
                {health.latest.details?.players_online !== undefined && (
                  <Text>
                    {t('health.players', {
                      online: health.latest.details.players_online,
                      max: health.latest.details.players_max ?? '—'
                    })}
                  </Text>
                )}
              </>
            )}
            {health?.next_check_at && (
              <Text color="muted" size="sm">
                {t('health.nextCheck', {
                  date: dayjs(health.next_check_at).format('lll')
                })}
              </Text>
            )}
            <Flex gap="sm" wrap="wrap">
              <Button
                disabled={
                  !selected.monitor_enabled || selected.monitor_kind === 'none'
                }
                icon="tabler:player-play"
                loading={pending}
                onClick={() =>
                  void run(() =>
                    workspaceAPI.checks.run
                      .input({ id: selected.id })
                      .mutate(undefined)
                  )
                }
              >
                checkNow
              </Button>
              <Button
                as={Link}
                to={{
                  search: sectionParams('services', {
                    service: selected.id,
                    edit: '1'
                  }).toString()
                }}
                variant="secondary"
              >
                health.editMonitor
              </Button>
            </Flex>
          </Card>
          {query.error && (
            <Card gap="md" role="alert">
              <Text color="dangerous">{query.error.message}</Text>
              <Button variant="secondary" onClick={() => void query.refetch()}>
                retry
              </Button>
            </Card>
          )}
          {query.isFetching && query.dataUpdatedAt === 0 ? (
            <Text role="status">{t('loading')}</Text>
          ) : (
            query.data && (
              <>
                <Card gap="md">
                  <Text as="h3" size="lg" weight="semibold">
                    {t('health.latencyHistory')}
                  </Text>
                  <LineChart
                    emptyLabel={t('health.noChecks')}
                    formatValue={value => `${Math.round(value)} ms`}
                    label={t('health.latencyHistory')}
                    points={points}
                  />
                  <Text color="muted">{t('health.historyHelp')}</Text>
                </Card>
                <Card gap="md">
                  <Text as="h3" size="lg" weight="semibold">
                    {t('health.checkHistory', {
                      count: query.data.checks.length
                    })}
                  </Text>
                  {query.data.truncated && (
                    <Text role="status">{t('health.truncated')}</Text>
                  )}
                  {!query.data.checks.length && (
                    <Text color="muted">{t('health.noChecks')}</Text>
                  )}
                  <Stack as="ul" gap="sm">
                    {query.data.checks.map(check => (
                      <Card key={check.id} as="li" gap="sm" p="sm">
                        <Flex gap="sm" justify="between" wrap="wrap">
                          <Text>{dayjs(check.checked_at).format('lll')}</Text>
                          <HealthBadge status={check.status} />
                        </Flex>
                        <Text>{check.message}</Text>
                        <Text
                          className="tech-lab-technical"
                          color="muted"
                          size="sm"
                        >
                          {check.monitor_target}
                          {check.monitor_port
                            ? `:${check.monitor_port}`
                            : ''} ·{' '}
                          {t('health.revision', {
                            revision: check.monitor_revision
                          })}
                        </Text>
                        <Text color="muted" size="sm">
                          {check.latency_ms === null
                            ? '—'
                            : `${Math.round(check.latency_ms)} ms`}
                          {check.http_status !== null
                            ? ` · HTTP ${check.http_status}`
                            : ''}
                        </Text>
                      </Card>
                    ))}
                  </Stack>
                </Card>
              </>
            )
          )}
        </>
      )}
    </Stack>
  )
}
