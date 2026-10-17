import dayjs from 'dayjs'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Grid, Stack, Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { ServiceCard } from '@/components/ServiceCard'
import { sectionParams } from '@/utils/navigation'

export default function OverviewView() {
  const { data } = useTechLab()
  const { t } = useModuleTranslation()

  if (!data) return null

  const counts = {
    devices: data.devices.length,
    services: data.services.length,
    up: data.health.filter(health => health.status === 'up').length,
    attention: data.health.filter(health =>
      ['down', 'error', 'stale'].includes(health.status)
    ).length
  }

  return (
    <Stack gap="lg">
      <Card>
        <Grid gap="lg" templateCols={{ base: 2, md: 4 }}>
          {Object.entries(counts).map(([key, value]) => (
            <Stack key={key} gap="sm">
              <Text color="muted">{t(`overview.${key}`)}</Text>
              <Text size="3xl" weight="semibold">
                {value}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Card>
      <Stack gap="md" py="lg">
        <Text as="h2" size="xl" weight="semibold">
          {t('overview.title')}
        </Text>
        <Text color="muted" size="sm">
          {t('overview.updated', {
            date: dayjs(data.checked_at).format('lll')
          })}
        </Text>
        <Flex gap="sm" wrap="wrap">
          <Button
            as={Link}
            icon="lucide:plus"
            to={{
              search: sectionParams('devices', { device: 'new' }).toString()
            }}
          >
            addDevice
          </Button>
          <Button
            as={Link}
            icon="lucide:plus"
            to={{
              search: sectionParams('services', { service: 'new' }).toString()
            }}
            variant="secondary"
          >
            addService
          </Button>
        </Flex>
      </Stack>
      {(['service', 'game', 'link'] as const).map(kind => {
        const services = data.services.filter(service => service.kind === kind)

        if (!services.length) return null

        return (
          <Stack key={kind} gap="md">
            <Text as="h2" size="xl" weight="semibold">
              {t(`kinds.${kind}`)}
            </Text>
            <Card p="none">
              <Grid gap="md" templateCols={{ base: 1, md: 2, xl: 3 }}>
                {services.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </Grid>
            </Card>
          </Stack>
        )
      })}
      {!data.services.length && (
        <Card gap="md">
          <Text>{t('messages.emptyInventory')}</Text>
          <Button
            as={Link}
            to={{ search: sectionParams('import').toString() }}
            variant="secondary"
          >
            sections.import
          </Button>
        </Card>
      )}
    </Stack>
  )
}
