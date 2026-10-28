import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { DeviceCard } from '@/components/DeviceCard'
import '@/live.css'

function Resources({ filter }: { filter: string }) {
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
  const device = query
    ? (data?.devices.find(item => item.name.toLocaleLowerCase() === query) ??
      data?.devices.find(item =>
        [item.name, item.host].some(value =>
          value.toLocaleLowerCase().includes(query)
        )
      ))
    : data?.devices.find(item => item.glances_url)

  if (!device)
    return (
      <Text color="muted">
        {query
          ? t('filters.results', { count: 0, total: data?.devices.length ?? 0 })
          : t('devices.telemetryDisabled')}
      </Text>
    )

  return (
    <div className="tech-lab-widget">
      <DeviceCard device={device} />
    </div>
  )
}

export default function DeviceResources({ filter = '' }: { filter?: string }) {
  return (
    <TechLabProvider>
      <Resources filter={filter} />
    </TechLabProvider>
  )
}

export const config: WidgetConfig = { id: 'techLabDevice', icon: 'lucide:cpu' }
