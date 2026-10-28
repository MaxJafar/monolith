import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Icon, Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { Meter } from '@/charts/Meter'
import { StatusMark } from '@/charts/StatusMark'
import { useDeviceTelemetry } from '@/hooks/useLiveData'
import '@/live.css'
import { formatDuration } from '@/utils/format'
import { deviceIcon } from '@/utils/icons'
import { ramPercent } from '@/utils/telemetryHistory'

import type { Device } from '../../../shared'

function Machine({ device }: { device: Device }) {
  const { t, i18n } = useModuleTranslation()

  const query = useDeviceTelemetry(
    device.glances_url ? device.id : undefined,
    10000
  )

  const value = query.data
  const online = value?.status === 'up'
  const state = !device.glances_url
    ? 'off'
    : !value
      ? 'pending'
      : online
        ? 'up'
        : 'down'

  return (
    <li className="tech-lab-fleet-row" data-state={state}>
      <span className="tech-lab-fleet-identity">
        <span className="tech-lab-device-icon">
          <Icon aria-hidden="true" icon={deviceIcon(device)} size="18px" />
        </span>
        <span className="tech-lab-device-title">
          <Text truncate weight="medium">
            {device.name}
          </Text>
          <Text truncate className="tech-lab-technical" color="muted" size="xs">
            {device.host || value?.system?.hostname || '—'}
          </Text>
        </span>
      </span>
      <StatusMark label={t(`live.machine.${state}`)} status={state} />
      <span className="tech-lab-fleet-meters">
        <Meter
          label={t('live.cpu')}
          value={online ? value.cpu_percent : null}
        />
        <Meter
          label={t('live.ram')}
          value={online ? ramPercent(value) : null}
        />
      </span>
      <Text className="tech-lab-fleet-uptime" color="muted" size="sm">
        {online
          ? t('live.uptime', {
              value: formatDuration(value.uptime_seconds, i18n.language)
            })
          : '—'}
      </Text>
    </li>
  )
}

function Machines({ filter }: { filter: string }) {
  const { data, loading, error } = useTechLab(),
    { t } = useModuleTranslation()

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )

  const query = filter.trim().toLocaleLowerCase()
  const devices = (data?.devices ?? []).filter(
    device =>
      !query ||
      [device.name, device.host, device.kind].some(value =>
        value.toLocaleLowerCase().includes(query)
      )
  )

  if (!devices.length) return <Text color="muted">{t('devices.empty')}</Text>

  return (
    <div className="tech-lab-widget">
      <ul
        aria-label={t('widgets.techLabFleet.title')}
        className="tech-lab-fleet"
      >
        {devices.map(device => (
          <Machine key={device.id} device={device} />
        ))}
      </ul>
    </div>
  )
}

export default function Fleet({ filter = '' }: { filter?: string }) {
  return (
    <TechLabProvider>
      <Machines filter={filter} />
    </TechLabProvider>
  )
}

export const config: WidgetConfig = {
  id: 'techLabFleet',
  icon: 'lucide:network'
}
