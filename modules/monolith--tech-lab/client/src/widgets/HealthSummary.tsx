import { useQueries } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { Meter } from '@/charts/Meter'
import { type LiveStatus, StatusMark } from '@/charts/StatusMark'
import '@/live.css'
import { workspaceAPI } from '@/manifest'
import { formatPercent } from '@/utils/format'
import { observedAvailability } from '@/utils/health'
import { averageAvailability } from '@/utils/live'

function Tile({
  label,
  value,
  status,
  statusLabel,
  children
}: {
  label: string
  value: string
  status: LiveStatus
  statusLabel: string
  children?: ReactNode
}) {
  return (
    <section className="tech-lab-kpi">
      <Text color="muted" size="sm">
        {label}
      </Text>
      <Text className="tech-lab-kpi-value" weight="semibold">
        {value}
      </Text>
      <StatusMark label={statusLabel} status={status} />
      {children}
    </section>
  )
}

function Summary() {
  const { data, ownerId, loading, error } = useTechLab(),
    { t, i18n } = useModuleTranslation()

  const watched = (data?.devices ?? []).filter(device => device.glances_url)
  const machines = useQueries({
    queries: watched.map(device =>
      workspaceAPI.devices.telemetry.input({ id: device.id }).queryOptions({
        queryKey: [...workspaceAPI.devices.telemetry.key, ownerId, device.id],
        enabled: !!ownerId,
        staleTime: 0,
        refetchInterval: 15000,
        refetchIntervalInBackground: false
      })
    )
  })

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )
  if (!data) return null

  const online = machines.filter(query => query.data?.status === 'up').length
  const reported = machines.filter(query => query.data).length
  const monitored = data.services.filter(service => service.monitor_enabled)
  const health = data.health.filter(item =>
    monitored.some(service => service.id === item.service_id)
  )
  const up = health.filter(item => item.status === 'up').length
  const attention = health.filter(item =>
    ['down', 'error', 'stale'].includes(item.status)
  )
  const availability = averageAvailability(health.map(observedAvailability))

  return (
    <div className="tech-lab-widget">
      <div className="tech-lab-kpis">
        <Tile
          label={t('live.machinesOnline')}
          status={
            !reported ? 'pending' : online === watched.length ? 'up' : 'down'
          }
          statusLabel={t('live.ofTotal', {
            count: online,
            total: watched.length
          })}
          value={`${online}/${watched.length}`}
        />
        <Tile
          label={t('live.servicesUp')}
          status={
            !monitored.length ? 'off' : up === monitored.length ? 'up' : 'down'
          }
          statusLabel={t('live.ofTotal', {
            count: up,
            total: monitored.length
          })}
          value={`${up}/${monitored.length}`}
        />
        <Tile
          label={t('live.availability')}
          status={
            availability === null
              ? 'unknown'
              : availability >= 99
                ? 'up'
                : 'warning'
          }
          statusLabel={t('live.lastDay')}
          value={formatPercent(availability, i18n.language)}
        >
          <Meter
            compact
            plain
            label={t('live.availability')}
            value={availability}
          />
        </Tile>
        <Tile
          label={t('live.attention')}
          status={attention.length ? 'warning' : 'up'}
          statusLabel={
            attention.length
              ? attention
                  .slice(0, 3)
                  .map(
                    item =>
                      data.services.find(
                        service => service.id === item.service_id
                      )?.name
                  )
                  .filter(Boolean)
                  .join(', ')
              : t('live.allClear')
          }
          value={String(attention.length)}
        />
      </div>
    </div>
  )
}

export default function HealthSummary() {
  return (
    <TechLabProvider>
      <Summary />
    </TechLabProvider>
  )
}

export const config: WidgetConfig = {
  id: 'techLabHealth',
  icon: 'lucide:activity'
}
