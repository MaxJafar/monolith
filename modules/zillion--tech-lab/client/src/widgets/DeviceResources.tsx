import type { WidgetConfig } from '@lifeforge/configs'
import { useModuleTranslation } from '@lifeforge/localization'
import { Stack, Text } from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { DeviceTelemetry } from '@/components/DeviceTelemetry'

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

  const device = filter
    ? data?.devices.find(item =>
        item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())
      )
    : data?.devices.find(item => item.glances_url)

  if (!device)
    return (
      <Text color="muted">
        {filter
          ? t('filters.results', { count: 0, total: data?.devices.length ?? 0 })
          : t('devices.telemetryDisabled')}
      </Text>
    )

  return (
    <Stack gap="md">
      <Text weight="semibold">{device.name}</Text>
      <DeviceTelemetry compact id={device.id} />
    </Stack>
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
