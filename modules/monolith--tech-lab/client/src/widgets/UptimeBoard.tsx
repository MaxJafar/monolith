import dayjs from 'dayjs'

import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { type LiveStatus, StatusMark } from '@/charts/StatusMark'
import { StatusStrip, type StripStatus } from '@/charts/StatusStrip'
import { useMonitorTimeline, useUptimeKuma } from '@/hooks/useLiveData'
import '@/live.css'
import { formatLatency, formatPercent } from '@/utils/format'
import { observedAvailability } from '@/utils/health'
import {
  averageAvailability,
  bucketStatus,
  healthMark,
  kumaMark
} from '@/utils/live'

type Row = {
  id: string
  name: string
  group: string
  status: LiveStatus
  statusLabel: string
  availability: number | null
  latency: number | null
  cells: { status: StripStatus; label: string }[]
}

function Board({
  rows,
  title,
  error
}: {
  rows: Row[]
  title: string
  error?: string
}) {
  const { t, i18n } = useModuleTranslation()

  const up = rows.filter(row => row.status === 'up').length
  const average = averageAvailability(rows.map(row => row.availability))

  return (
    <div className="tech-lab-widget">
      <header className="tech-lab-uptime-summary">
        <span>
          <Text className="tech-lab-hero" weight="semibold">
            {formatPercent(average, i18n.language)}
          </Text>
          <Text color="muted" size="sm">
            {title}
          </Text>
        </span>
        <StatusMark
          label={t('live.upOf', { up, total: rows.length })}
          status={!rows.length ? 'unknown' : up === rows.length ? 'up' : 'down'}
        />
      </header>
      {error && (
        <Text color="dangerous" role="alert" size="sm">
          {error}
        </Text>
      )}
      {!rows.length && !error && (
        <Text color="muted" size="sm">
          {t('live.noMonitors')}
        </Text>
      )}
      <ul className="tech-lab-uptime">
        {rows.map(row => (
          <li key={row.id} className="tech-lab-uptime-row">
            <span className="tech-lab-uptime-name">
              <StatusMark
                hideLabel
                label={row.statusLabel}
                status={row.status}
              />
              <span className="tech-lab-device-title">
                <Text truncate weight="medium">
                  {row.name}
                </Text>
                {row.group && (
                  <Text truncate color="muted" size="xs">
                    {row.group}
                  </Text>
                )}
              </span>
            </span>
            <StatusStrip
              cells={row.cells}
              label={t('live.timeline', { name: row.name })}
            />
            <span className="tech-lab-uptime-figures">
              <Text size="sm" weight="medium">
                {formatPercent(row.availability, i18n.language)}
              </Text>
              <Text color="muted" size="xs">
                {formatLatency(row.latency, i18n.language)}
              </Text>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function KumaBoard({ url }: { url: string }) {
  const { t } = useModuleTranslation()
  const query = useUptimeKuma(url)

  if (query.isPending) return <Text role="status">{t('loading')}</Text>

  const rows: Row[] = (query.data?.monitors ?? []).map(monitor => ({
    id: String(monitor.id),
    name: monitor.name,
    group: monitor.group,
    status: kumaMark(monitor.status),
    statusLabel: t(`live.kuma.${monitor.status ?? 'unknown'}`),
    availability: monitor.uptime_24h === null ? null : monitor.uptime_24h * 100,
    latency: monitor.ping_ms,
    cells: monitor.beats.slice(-50).map(beat => ({
      status: beat.status,
      label: t('live.beat', {
        time: dayjs(beat.time).format('lll'),
        status: t(`live.kuma.${beat.status}`),
        ping: beat.ping_ms === null ? '' : ` · ${Math.round(beat.ping_ms)} ms`
      })
    }))
  }))

  return (
    <Board
      error={query.error?.message}
      rows={rows}
      title={query.data?.title || t('live.lastDay')}
    />
  )
}

function NativeBoard() {
  const { data, healthByService } = useTechLab(),
    { t } = useModuleTranslation()

  const timeline = useMonitorTimeline()

  const strips = new Map(
    timeline.data?.services.map(item => [item.service_id, item.buckets]) ?? []
  )
  const rows: Row[] = (data?.services ?? [])
    .filter(service => service.monitor_enabled)
    .map(service => {
      const health = healthByService.get(service.id)
      const status = health?.status ?? 'unknown'

      return {
        id: service.id,
        name: service.name,
        group: service.category,
        status: healthMark[status],
        statusLabel: t(`status.${status}`),
        availability: observedAvailability(health),
        latency: health?.latest?.latency_ms ?? null,
        cells: (strips.get(service.id) ?? []).map((bucket, index) => {
          const time = dayjs(timeline.data!.from)
            .add(index * timeline.data!.bucket_seconds, 'second')
            .format('lll')

          return {
            status: bucketStatus(bucket),
            label: bucket
              ? t('live.bucket', {
                  time,
                  up: bucket.up,
                  failed: bucket.down + bucket.error
                })
              : t('live.noChecks', { time })
          }
        })
      }
    })

  return (
    <Board
      error={timeline.error?.message}
      rows={rows}
      title={t('live.lastDay')}
    />
  )
}

function Uptime({ filter }: { filter: string }) {
  const { loading, error } = useTechLab(),
    { t } = useModuleTranslation()

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )

  const url = filter.trim()

  return /^https?:\/\//i.test(url) ? <KumaBoard url={url} /> : <NativeBoard />
}

export default function UptimeBoard({ filter = '' }: { filter?: string }) {
  return (
    <TechLabProvider>
      <Uptime filter={filter} />
    </TechLabProvider>
  )
}

export const config: WidgetConfig = {
  id: 'techLabUptime',
  icon: 'lucide:activity'
}
