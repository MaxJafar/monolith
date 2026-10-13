import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { useFederation } from '@lifeforge/federation'
import { Box, Button, Card, Flex, Grid, Icon, Text } from '@lifeforge/ui'

import MonolithLogo from '@/core/components/MonolithLogo'
import { modulePath } from '@/core/routing/utils/navigation'

export default function WorkspaceOverview() {
  const { t } = useTranslation('common.dashboard')
  const { userData } = useAuth()
  const { moduleGroups } = useFederation()

  const modules = moduleGroups
    .flatMap(group => group.items)
    .filter(
      module => module.rawModule && !module.hidden && module.disabled !== true
    )

  const { t: translate } = useTranslation(
    modules.map(module => `apps.${module.name}`)
  )

  return (
    <Flex direction="column" gap="xl" pb="xl">
      <Card gap="md" p={{ base: 'lg', lg: 'xl' }}>
        <Flex
          align={{ base: 'start', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap="lg"
          justify="between"
        >
          <Flex direction="column" gap="sm" maxWidth="42em">
            <Flex align="center" gap="sm">
              <MonolithLogo size={20} />
              <Text color="muted">
                {t('overview.greeting', {
                  name: userData?.name || userData?.username
                })}
              </Text>
            </Flex>
            <Text
              as="h2"
              size={{ base: '2xl', md: '3xl' }}
              tracking="tight"
              weight="semibold"
            >
              {t('overview.heading')}
            </Text>
            <Text as="p" color="muted" leading="relaxed">
              {t('overview.description')}
            </Text>
          </Flex>
          <Flex flexShrink="0">
            <Button
              as={Link}
              icon="lucide:arrow-up-right"
              iconPosition="end"
              namespace={false}
              to="/databases"
            >
              {t('overview.databases')}
            </Button>
          </Flex>
        </Flex>
      </Card>
      <Flex as="section" direction="column" gap="md">
        <Text as="h2" size="lg" weight="semibold">
          {t('overview.quickAccess')}
        </Text>
        <Grid gap="md" templateCols={{ base: 1, md: 3 }}>
          {[
            {
              key: 'documents',
              icon: 'lucide:files',
              path: '/databases?section=documents'
            },
            {
              key: 'knowledge',
              icon: 'lucide:network',
              path: '/databases?section=graph'
            },
            { key: 'agents', icon: 'lucide:bot', path: '/agents' }
          ].map(shortcut => (
            <Card
              key={shortcut.key}
              asChild
              isInteractive
              align="start"
              direction="row"
              gap="md"
              minWidth="0"
              p="md"
            >
              <Link to={shortcut.path}>
                <Flex
                  centered
                  bg={{ base: 'bg-200', dark: 'bg-800' }}
                  flexShrink="0"
                  height="2.5em"
                  r="sm"
                  width="2.5em"
                >
                  <Icon color="muted" icon={shortcut.icon} size="1.4em" />
                </Flex>
                <Flex direction="column" flex="1" gap="xs" minWidth="0">
                  <Text weight="semibold">{t(`overview.${shortcut.key}`)}</Text>
                  <Text as="p" color="muted" leading="relaxed">
                    {t(`overview.${shortcut.key}Description`)}
                  </Text>
                </Flex>
                <Box asChild flexShrink="0">
                  <Icon
                    color="muted"
                    icon="lucide:arrow-up-right"
                    size="1.1em"
                  />
                </Box>
              </Link>
            </Card>
          ))}
        </Grid>
      </Flex>
      <Flex direction="column" gap="md">
        <Flex direction="column" gap="xs">
          <Text as="h2" size="lg" weight="semibold">
            {t('overview.tools')}
          </Text>
          <Text as="p" color="muted">
            {t('overview.toolsDescription')}
          </Text>
        </Flex>
        <Grid gap="sm" templateCols={{ base: 1, md: 2, '2xl': 3 }}>
          {modules.map(module => {
            const stripped = module.name.replace(/^@[^/]+\//, '')

            return (
              <Card
                key={module.name}
                asChild
                isInteractive
                align="center"
                direction="row"
                gap="md"
                minWidth="0"
                p="md"
              >
                <Link to={modulePath(module.name)}>
                  <Flex
                    centered
                    bg={{ base: 'bg-200', dark: 'bg-800' }}
                    flexShrink="0"
                    height="2.75em"
                    r="sm"
                    width="2.75em"
                  >
                    <Icon
                      color={{ base: 'bg-600', dark: 'bg-300' }}
                      icon={module.icon || 'lucide:app-window'}
                      size="1.4em"
                    />
                  </Flex>
                  <Flex direction="column" flex="1" gap="xs" minWidth="0">
                    <Text weight="semibold">
                      {translate(`apps.${module.name}:title`, {
                        defaultValue: module.rawModule?.displayName || stripped
                      })}
                    </Text>
                    <Text as="p" color="muted" leading="relaxed">
                      {translate(`apps.${module.name}:description`, {
                        defaultValue: ''
                      })}
                    </Text>
                  </Flex>
                  <Box asChild flexShrink="0">
                    <Icon
                      color="muted"
                      icon="lucide:arrow-up-right"
                      size="1.25em"
                    />
                  </Box>
                </Link>
              </Card>
            )
          })}
        </Grid>
      </Flex>
    </Flex>
  )
}
