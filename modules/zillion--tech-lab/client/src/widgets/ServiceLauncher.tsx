import { Link } from 'react-router'

import type { WidgetConfig } from '@lifeforge/configs'
import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Grid, Icon, Stack, Text } from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { TechLabProvider } from '@/TechLabProvider'
import { HealthBadge } from '@/components/HealthBadge'
import { safeWebUrl } from '@/utils/navigation'

function Launcher({ filter }: { filter: string }) {
  const { data, healthByService, loading, error } = useTechLab(),
    { t } = useModuleTranslation()

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )

  return (
    <Grid gap="sm" templateCols={{ base: 1, md: 2, xl: 3 }}>
      {data?.services
        .filter(
          service =>
            !filter ||
            service.name
              .toLocaleLowerCase()
              .includes(filter.toLocaleLowerCase())
        )
        .map(service => (
          <Flex
            key={service.id}
            align="center"
            bg="surface"
            gap="sm"
            p="md"
            r="sm"
          >
            <Icon
              color="muted"
              icon={
                service.kind === 'game' ? 'lucide:gamepad-2' : 'lucide:server'
              }
            />
            <Stack flex="1" gap="xs" minWidth="0">
              <Text overflowWrap="anywhere" weight="medium">
                {service.name}
              </Text>
              <HealthBadge
                status={healthByService.get(service.id)?.status ?? 'unknown'}
              />
            </Stack>
            {safeWebUrl(service.url) ? (
              <Button
                aria-label={t('buttons.open') + ' ' + service.name}
                as="a"
                href={safeWebUrl(service.url) ?? undefined}
                icon="lucide:arrow-up-right"
                rel="noopener noreferrer"
                target="_blank"
                variant="plain"
              />
            ) : (
              <Button
                aria-label={t('buttons.details') + ' ' + service.name}
                as={Link}
                icon="lucide:arrow-right"
                to={`/tech-lab?section=services&service=${service.id}`}
                variant="plain"
              />
            )}
          </Flex>
        ))}
    </Grid>
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
  icon: 'lucide:server'
}
