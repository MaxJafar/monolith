import dayjs from 'dayjs'

import { useModuleTranslation } from '@monolith/localization'
import { Icon, Text } from '@monolith/ui'

import { Meter } from '@/charts/Meter'
import { Sparkline } from '@/charts/Sparkline'
import { StatusMark } from '@/charts/StatusMark'
import { useDeviceTelemetry } from '@/hooks/useLiveData'
import { formatDuration, formatPercent } from '@/utils/format'
import { formatBytes } from '@/utils/health'
import { deviceIcon } from '@/utils/icons'
import { ramPercent, useTelemetryHistory } from '@/utils/telemetryHistory'

import type { Device } from '../../../shared'

/** Homepage-style machine card: identity, live CPU and RAM, disks, processes. */
export function DeviceCard({ device }: { device: Device }) {
  const { t, i18n } = useModuleTranslation()
  const query = useDeviceTelemetry(device.glances_url ? device.id : undefined)
  const samples = useTelemetryHistory(device.id)

  const value = query.data
  const online = value?.status === 'up'
  const state = !device.glances_url
    ? 'off'
    : !value
      ? 'pending'
      : online
        ? 'up'
        : 'down'
  const times = samples.map(sample => dayjs(sample.at).format('LTS'))
  const percent = (number: number) => formatPercent(number, i18n.language)
  const disks = online
    ? [...value.filesystems]
        .sort((a, b) => b.total_bytes - a.total_bytes)
        .slice(0, 4)
    : []

  return (
    <article className="tech-lab-device" data-state={state}>
      <header className="tech-lab-device-header">
        <span className="tech-lab-device-icon">
          <Icon aria-hidden="true" icon={deviceIcon(device)} size="22px" />
        </span>
        <span className="tech-lab-device-title">
          <Text truncate weight="semibold">
            {device.name}
          </Text>
          <Text truncate className="tech-lab-technical" color="muted" size="sm">
            {[device.host, value?.system?.hostname].filter(Boolean).join(' · ')}
          </Text>
        </span>
        <StatusMark label={t(`live.machine.${state}`)} status={state} />
      </header>
      {online ? (
        <>
          {(value.system || value.cpu_name) && (
            <Text truncate color="muted" size="sm">
              {[value.system?.name, value.cpu_name].filter(Boolean).join(' · ')}
            </Text>
          )}
          <div className="tech-lab-device-metrics">
            <section className="tech-lab-metric">
              <div className="tech-lab-metric-head">
                <Text color="muted" size="sm">
                  {t('live.cpu')}
                </Text>
                <Text className="tech-lab-metric-value" weight="semibold">
                  {formatPercent(value.cpu_percent, i18n.language)}
                </Text>
              </div>
              <Sparkline
                format={percent}
                label={t('live.cpuHistory')}
                labels={times}
                values={samples.map(sample => sample.cpu)}
              />
              {value.load && (
                <Text color="muted" size="xs">
                  {t('live.load', {
                    values: [value.load.min1, value.load.min5, value.load.min15]
                      .map(load =>
                        load.toLocaleString(i18n.language, {
                          maximumFractionDigits: 2
                        })
                      )
                      .join(' · ')
                  })}
                </Text>
              )}
            </section>
            <section className="tech-lab-metric">
              <div className="tech-lab-metric-head">
                <Text color="muted" size="sm">
                  {t('live.ram')}
                </Text>
                <Text className="tech-lab-metric-value" weight="semibold">
                  {formatPercent(ramPercent(value), i18n.language)}
                </Text>
              </div>
              <Sparkline
                format={percent}
                label={t('live.ramHistory')}
                labels={times}
                values={samples.map(sample => sample.ram)}
              />
              <Text color="muted" size="xs">
                {t('live.memoryOf', {
                  used: formatBytes(value.ram_used_bytes),
                  total: formatBytes(value.ram_total_bytes)
                })}
              </Text>
            </section>
          </div>
          {!!disks.length && (
            <section className="tech-lab-device-disks">
              <Text color="muted" size="sm">
                {t('live.disks')}
              </Text>
              {disks.map(disk => (
                <Meter
                  key={disk.name}
                  detail={`${formatBytes(disk.used_bytes)} / ${formatBytes(disk.total_bytes)}`}
                  label={disk.name}
                  value={
                    disk.total_bytes
                      ? (disk.used_bytes / disk.total_bytes) * 100
                      : null
                  }
                />
              ))}
            </section>
          )}
          {!!value.processes.length && (
            <section className="tech-lab-device-processes">
              <Text color="muted" size="sm">
                {t('live.processes')}
              </Text>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('live.process')}</th>
                    <th scope="col">{t('live.cpu')}</th>
                    <th scope="col">{t('live.ram')}</th>
                  </tr>
                </thead>
                <tbody>
                  {value.processes.slice(0, 5).map((process, index) => (
                    <tr key={`${process.name}-${index}`}>
                      <td>{process.name}</td>
                      <td>
                        {formatPercent(process.cpu_percent, i18n.language)}
                      </td>
                      <td>
                        {formatPercent(process.memory_percent, i18n.language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <Text color="muted" size="xs">
            {t('live.uptime', {
              value: formatDuration(value.uptime_seconds, i18n.language)
            })}
          </Text>
        </>
      ) : (
        <Text color="muted" size="sm">
          {state === 'off'
            ? t('devices.telemetryDisabled')
            : state === 'pending'
              ? t('loading')
              : t('live.unreachable')}
        </Text>
      )}
    </article>
  )
}
