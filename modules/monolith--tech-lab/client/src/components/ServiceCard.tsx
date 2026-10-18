import dayjs from 'dayjs'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Stack, TagChip, Text } from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { observedAvailability } from '@/utils/health'
import { safeWebUrl, sectionParams } from '@/utils/navigation'

import type { Service } from '../../../shared'
import { HealthBadge } from './HealthBadge'

export function ServiceCard({ service }: { service: Service }) {
  const { t } = useModuleTranslation()
  const { healthByService, devicesById, pending, run } = useTechLab()

  const health = healthByService.get(service.id)
  const device = service.device_id ? devicesById.get(service.device_id) : null
  const availability = observedAvailability(health)
  const url = safeWebUrl(service.url)

  return (
    <Stack gap="md" minWidth="0" p="lg">
      <Flex align="start" gap="sm" justify="between" wrap="wrap">
        <Stack gap="xs">
          <Flex align="center" gap="sm">
            <Icon
              color="muted"
              icon={
                service.kind === 'game'
                  ? 'lucide:gamepad-2'
                  : service.kind === 'link'
                    ? 'lucide:link'
                    : 'lucide:app-window'
              }
            />
            <Text as="h3" overflowWrap="anywhere" size="lg" weight="semibold">
              {service.name}
            </Text>
          </Flex>
          <Text color="muted">
            {service.category || t(`kinds.${service.kind}`)}
          </Text>
        </Stack>
        <HealthBadge status={health?.status ?? 'unknown'} />
      </Flex>
      {service.description && (
        <Text color="muted" lineClamp={2}>
          {service.description}
        </Text>
      )}
      {service.address && (
        <Text className="tech-lab-technical" size="sm">
          {service.address}
        </Text>
      )}
      <Flex gap="sm" wrap="wrap">
        {service.tags.map(tag => (
          <TagChip key={tag} label={tag} variant="outlined" />
        ))}
      </Flex>
      <Flex gap="lg" wrap="wrap">
        <Stack gap="xs">
          <Text color="muted" size="sm">
            {t('health.latency')}
          </Text>
          <Text weight="semibold">
            {health?.latest?.latency_ms === null ||
            health?.latest?.latency_ms === undefined
              ? '—'
              : `${Math.round(health.latest.latency_ms)} ms`}
          </Text>
        </Stack>
        <Stack gap="xs">
          <Text color="muted" size="sm">
            {t('health.observed24h')}
          </Text>
          <Text weight="semibold">
            {availability === null
              ? '—'
              : `${availability.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
          </Text>
          <Text color="muted" size="sm">
            {t('health.samples', { count: health?.observed_24h.total ?? 0 })}
          </Text>
        </Stack>
      </Flex>
      {health?.latest && (
        <Text color="muted" size="sm">
          {t('health.lastChecked', {
            date: dayjs(health.latest.checked_at).format('lll')
          })}
        </Text>
      )}
      <Flex gap="sm" wrap="wrap">
        {url && (
          <Button
            as="a"
            href={url}
            icon="lucide:external-link"
            rel="noopener noreferrer"
            target="_blank"
            variant="secondary"
          >
            open
          </Button>
        )}
        {service.address && (
          <Button
            icon="lucide:copy"
            loading={pending}
            variant="secondary"
            onClick={() =>
              void run(() => navigator.clipboard.writeText(service.address))
            }
          >
            copyAddress
          </Button>
        )}
        <Button
          as={Link}
          to={{
            search: sectionParams('services', {
              service: service.id
            }).toString()
          }}
          variant="secondary"
        >
          details
        </Button>
        <Button
          as={Link}
          to={{
            search: sectionParams('health', { service: service.id }).toString()
          }}
          variant="plain"
        >
          sections.health
        </Button>
        {device && (
          <Button
            as={Link}
            icon="lucide:server"
            namespace={false}
            to={{
              search: sectionParams('devices', { device: device.id }).toString()
            }}
            variant="plain"
          >
            {device.name}
          </Button>
        )}
      </Flex>
    </Stack>
  )
}
