import dayjs from 'dayjs'
import { Link } from 'react-router'

import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Icon, Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { StatusMark } from '@/charts/StatusMark'
import { StatusStrip } from '@/charts/StatusStrip'
import { useMonitorTimeline } from '@/hooks/useLiveData'
import '@/live.css'
import { formatLatency, formatPercent } from '@/utils/format'
import { observedAvailability } from '@/utils/health'
import { serviceIcon } from '@/utils/icons'
import { bucketStatus, groupBy, healthMark } from '@/utils/live'
import { safeWebUrl } from '@/utils/navigation'

import type { Service, ServiceHealth, TechLabTimeline } from '../../../shared'

function ServiceTile({
  service,
  health,
  buckets,
  from,
  width
}: {
  service: Service
  health?: ServiceHealth
  buckets?: TechLabTimeline['services'][number]['buckets']
  from?: string
  width?: number
}) {
  const { t, i18n } = useModuleTranslation()

  const url = safeWebUrl(service.url)
  const status = health?.status ?? 'unknown'
  const availability = observedAvailability(health)
  const body = (
    <>
      <span className="tech-lab-service-icon">
        <Icon aria-hidden="true" icon={serviceIcon(service)} size="22px" />
      </span>
      <span className="tech-lab-service-body">
        <Text truncate weight="semibold">
          {service.name}
        </Text>
        {service.description && (
          <Text
            className="tech-lab-service-description"
            color="muted"
            size="sm"
          >
            {service.description}
          </Text>
        )}
        {service.monitor_enabled ? (
          <span className="tech-lab-service-meta">
            <StatusMark
              label={t(`status.${status}`)}
              status={healthMark[status]}
            />
            {health?.latest?.latency_ms !== undefined &&
              health.latest.latency_ms !== null && (
                <Text color="muted" size="xs">
                  {formatLatency(health.latest.latency_ms, i18n.language)}
                </Text>
              )}
            {availability !== null && (
              <Text color="muted" size="xs">
                {t('live.dayAvailability', {
                  value: formatPercent(availability, i18n.language)
                })}
              </Text>
            )}
          </span>
        ) : (
          <Text truncate className="tech-lab-technical" color="muted" size="xs">
            {service.address || (url ? new URL(url).host : t('live.link'))}
          </Text>
        )}
        {service.monitor_enabled && buckets && from && width && (
          <StatusStrip
            cells={buckets.map((bucket, index) => {
              const time = dayjs(from)
                .add(index * width, 'second')
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
            })}
            label={t('live.timeline', { name: service.name })}
          />
        )}
      </span>
    </>
  )

  return url ? (
    <a
      aria-label={t('live.open', { name: service.name })}
      className="tech-lab-service"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {body}
    </a>
  ) : (
    <Link
      className="tech-lab-service"
      to={`/tech-lab?section=services&service=${service.id}`}
    >
      {body}
    </Link>
  )
}

function Launcher({ filter }: { filter: string }) {
  const { data, healthByService, loading, error } = useTechLab(),
    { t } = useModuleTranslation()

  const timeline = useMonitorTimeline()

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )

  const query = filter.trim().toLocaleLowerCase()
  const all = data?.services ?? []
  const exact = all.filter(
    service => service.category.toLocaleLowerCase() === query
  )
  const services = query
    ? exact.length
      ? exact
      : all.filter(service =>
          [service.name, service.category, service.description].some(value =>
            value.toLocaleLowerCase().includes(query)
          )
        )
    : all
  const strips = new Map(
    timeline.data?.services.map(item => [item.service_id, item.buckets]) ?? []
  )
  const groups = groupBy(services, service => service.category)

  if (!services.length)
    return <Text color="muted">{t('messages.emptyInventory')}</Text>

  return (
    <div className="tech-lab-widget">
      {[...groups].map(([category, items]) => {
        const monitored = items.filter(item => item.monitor_enabled)
        const up = monitored.filter(
          item => healthByService.get(item.id)?.status === 'up'
        ).length

        return (
          <section key={category} className="tech-lab-service-group">
            {(groups.size > 1 || !exact.length) && (
              <header className="tech-lab-group-heading">
                <Text as="h3" size="sm" weight="semibold">
                  {category || t('live.ungrouped')}
                </Text>
                {!!monitored.length && (
                  <Text color="muted" size="xs">
                    {t('live.upOf', { up, total: monitored.length })}
                  </Text>
                )}
              </header>
            )}
            <div className="tech-lab-service-grid">
              {items.map(service => (
                <ServiceTile
                  key={service.id}
                  buckets={strips.get(service.id)}
                  from={timeline.data?.from}
                  health={healthByService.get(service.id)}
                  service={service}
                  width={timeline.data?.bucket_seconds}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default function ServiceLauncher({ filter = '' }: { filter?: string }) {
  return (
    <TechLabProvider>
      <Launcher filter={filter} />
    </TechLabProvider>
  )
}

export const config: WidgetConfig = {
  id: 'techLabServices',
  icon: 'lucide:panels-top-left'
}
