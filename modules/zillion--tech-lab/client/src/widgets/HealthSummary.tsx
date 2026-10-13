import type { WidgetConfig } from '@lifeforge/configs'
import { useModuleTranslation } from '@lifeforge/localization'
import { Grid, Stack, Text } from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'

function Summary() {
  const { data, loading, error } = useTechLab(),
    { t } = useModuleTranslation()

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )
  if (!data) return null

  const counts = {
    devices: data.devices.length,
    services: data.services.length,
    up: data.health.filter(item => item.status === 'up').length,
    attention: data.health.filter(item =>
      ['down', 'error', 'stale'].includes(item.status)
    ).length
  }

  return (
    <Grid gap="md" templateCols={{ base: 2, md: 4 }}>
      {Object.entries(counts).map(([key, count]) => (
        <Stack key={key} bg="surface" gap="sm" p="md" r="sm">
          <Text color="muted">{t(`overview.${key}`)}</Text>
          <Text size="3xl" weight="semibold">
            {count}
          </Text>
        </Stack>
      ))}
    </Grid>
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
