import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Icon,
  ModuleHeader,
  Stack,
  Text
} from '@lifeforge/ui'

import './AgentContent.css'
import { useAgents } from './AgentContext'
import { AgentProvider } from './AgentProvider'
import People from './components/People'
import Playbooks from './components/Playbooks'
import Runs from './components/Runs'
import Usage from './components/Usage'
import Work from './components/Work'

function Workspace() {
  const { t } = useModuleTranslation(),
    { data, section, navigate, error, query, busy } = useAgents()
  const metrics = [
    [
      'team',
      data.principals.filter(p => p.kind === 'agent').length,
      'tabler:robot'
    ],
    [
      'active',
      data.runs.filter(r => r.status === 'queued' || r.status === 'running')
        .length,
      'tabler:activity'
    ],
    [
      'review',
      data.runs.filter(r => r.status === 'review').length,
      'tabler:checks'
    ],
    ['projects', data.projects.length, 'tabler:briefcase']
  ] as const

  return (
    <>
      <ModuleHeader />
      <Box flex="1" minHeight="0" overflowY="auto" p={{ base: 'sm', md: 'lg' }}>
        <Stack gap="lg" maxWidth="100rem" width="100%">
          <Flex align="center" gap="md" justify="between" wrap="wrap">
            <Stack flex="1">
              <Text as="h2" size="xl" tracking="tight" weight="semibold">
                {t('heading')}
              </Text>
              <Text color="muted" size="sm">
                {t('intro')}
              </Text>
            </Stack>
            <Button
              disabled={busy || query.isFetching}
              icon="tabler:refresh"
              namespace={false}
              variant="secondary"
              onClick={() => {
                void query.refetch()
              }}
            >
              {t('refresh')}
            </Button>
          </Flex>
          <Grid gap="md" templateCols={{ base: 2, lg: 4 }}>
            {metrics.map(([label, count, icon]) => (
              <Card key={label} gap="sm">
                <Flex align="center" gap="sm">
                  <Icon color="muted" icon={icon} />
                  <Text color="muted" size="sm">
                    {t('metrics.' + label)}
                  </Text>
                </Flex>
                <Text size="2xl" weight="semibold">
                  {count}
                </Text>
              </Card>
            ))}
          </Grid>
          <Flex aria-label={t('title')} gap="sm" role="navigation" wrap="wrap">
            {['work', 'people', 'playbooks', 'runs', 'usage'].map(s => (
              <Button
                key={s}
                aria-pressed={section === s}
                icon={
                  s === 'playbooks'
                    ? 'tabler:books'
                    : s === 'people'
                      ? 'tabler:users'
                      : s === 'usage'
                        ? 'tabler:chart-bar'
                        : s === 'runs'
                          ? 'tabler:timeline'
                          : 'tabler:layout-kanban'
                }
                namespace={false}
                variant={section === s ? 'primary' : 'secondary'}
                onClick={() =>
                  navigate({
                    section: s,
                    person: null,
                    task: null,
                    run: null,
                    new: null,
                    offset: null,
                    playbook: null
                  })
                }
              >
                {t(s === 'usage' ? 'accountUsage' : 'sections.' + s)}
              </Button>
            ))}
          </Flex>
          {(error || query.error) && (
            <Card role="alert">
              <Text color="dangerous">{error || String(query.error)}</Text>
            </Card>
          )}
          {query.isPending ? (
            <Text role="status">{t('loading')}</Text>
          ) : section === 'people' ? (
            <People />
          ) : section === 'playbooks' ? (
            <Playbooks />
          ) : section === 'runs' ? (
            <Runs />
          ) : section === 'usage' ? (
            <Usage />
          ) : (
            <Work />
          )}
        </Stack>
      </Box>
    </>
  )
}

export default function Agents() {
  return (
    <AgentProvider>
      <Workspace />
    </AgentProvider>
  )
}
