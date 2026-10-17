import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Grid,
  HorizontalBarChart,
  Stack,
  Text
} from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { workspaceAPI } from '@/manifest'
import { formatBytes } from '@/utils/health'

dayjs.extend(localizedFormat)

export function DeviceTelemetry({
  id,
  compact = false
}: {
  id: string
  compact?: boolean
}) {
  const { t } = useModuleTranslation()
  const { ownerId } = useTechLab()

  const query = useQuery(
    workspaceAPI.devices.telemetry.input({ id }).queryOptions({
      queryKey: [...workspaceAPI.devices.telemetry.key, ownerId, id],
      enabled: !!ownerId,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 30000,
      refetchIntervalInBackground: false
    })
  )
  const value = query.data

  return (
    <Card gap="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('devices.telemetry')}
      </Text>
      {query.isFetching && query.dataUpdatedAt === 0 && (
        <Text role="status">{t('loading')}</Text>
      )}
      {query.error && (
        <Stack gap="sm">
          <Text color="dangerous" role="alert">
            {query.error.message}
          </Text>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            retry
          </Button>
        </Stack>
      )}
      {value && (
        <>
          {value.status !== 'up' ? (
            <Text role="status">
              {t(
                value.status === 'disabled'
                  ? 'devices.telemetryDisabled'
                  : 'devices.telemetryError'
              )}
              : {value.message}
            </Text>
          ) : (
            <>
              {value.message && (
                <Text color="muted" role="status">
                  {value.message}
                </Text>
              )}
              <HorizontalBarChart
                formatValue={value =>
                  `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
                }
                label={t('devices.utilization')}
                max={100}
                points={[
                  { label: t('devices.cpu'), value: value.cpu_percent },
                  {
                    label: t('devices.ram'),
                    value:
                      value.ram_used_bytes !== null &&
                      value.ram_total_bytes !== null &&
                      value.ram_total_bytes > 0
                        ? (value.ram_used_bytes / value.ram_total_bytes) * 100
                        : null
                  }
                ]}
              />
              <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
                <Text>
                  {t('devices.memory', {
                    used: formatBytes(value.ram_used_bytes),
                    total: formatBytes(value.ram_total_bytes)
                  })}
                </Text>
                <Text>
                  {t('devices.uptime', {
                    hours:
                      value.uptime_seconds === null
                        ? '—'
                        : (value.uptime_seconds / 3600).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 1 }
                          )
                  })}
                </Text>
              </Grid>
              {!compact && !!value.filesystems.length && (
                <HorizontalBarChart
                  formatValue={value =>
                    `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
                  }
                  label={t('devices.filesystems')}
                  max={100}
                  points={value.filesystems.map(fs => ({
                    label: fs.name,
                    value:
                      fs.total_bytes > 0
                        ? (fs.used_bytes / fs.total_bytes) * 100
                        : null,
                    detail: `${formatBytes(fs.used_bytes)} / ${formatBytes(fs.total_bytes)}`
                  }))}
                />
              )}
            </>
          )}
          <Text color="muted" size="sm">
            {t('devices.captured', {
              date: dayjs(value.captured_at).format('lll')
            })}
          </Text>
        </>
      )}
    </Card>
  )
}
