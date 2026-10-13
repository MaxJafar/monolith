import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Grid, Icon, Stack, Text } from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'

import Profile from './AgentProfile'
import Credentials from './WorkerCredentials'

const money = (cents: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)

export default function People() {
  const { t } = useModuleTranslation(),
    { data, params, navigate } = useAgents()
  const selected = data.principals.find(p => p.id === params.get('person'))

  return (
    <Stack gap="lg">
      <Flex align="center" justify="between">
        <Text as="h2" size="xl" weight="semibold">
          {t('team')}
        </Text>
        <Button
          icon="tabler:plus"
          namespace={false}
          onClick={() => navigate({ person: null, new: 'agent' })}
        >
          {t('newAgent')}
        </Button>
      </Flex>
      <Grid
        gap="lg"
        templateCols={{ base: 1, lg: 'minmax(0, 1fr) minmax(0, 1fr)' }}
      >
        <Stack gap="md">
          {data.principals.map(p => {
            const used = data.usage.find(u => u.principal_id === p.id),
              manager = data.principals.find(m => m.id === p.reports_to)

            return (
              <Card key={p.id} gap="md">
                <Flex align="center" gap="md">
                  <Flex
                    centered
                    bg={{ base: 'bg-100', dark: 'bg-800' }}
                    height="3rem"
                    r="lg"
                    width="3rem"
                  >
                    <Icon
                      color="primary"
                      icon={p.kind === 'human' ? 'tabler:user' : 'tabler:robot'}
                      size="1.5em"
                    />
                  </Flex>
                  <Stack flex="1">
                    <Text size="lg" weight="semibold">
                      {p.kind === 'human' ? t('you') : p.name}
                    </Text>
                    <Text color="muted" size="sm">
                      {t('kinds.' + p.kind)} · {t('roles.' + p.role)} ·{' '}
                      {t('statuses.' + p.status)}
                    </Text>
                  </Stack>
                  {p.kind === 'agent' && (
                    <Button
                      icon="tabler:adjustments"
                      namespace={false}
                      variant="plain"
                      onClick={() => navigate({ person: p.id, new: null })}
                    >
                      {t('edit')}
                    </Button>
                  )}
                </Flex>
                {p.kind === 'agent' && (
                  <>
                    <Text color="muted" size="sm">
                      {t('reportsTo', {
                        name:
                          manager?.kind === 'human'
                            ? t('you')
                            : (manager?.name ?? t('none'))
                      })}{' '}
                      · {t('adapters.' + p.adapter)}
                    </Text>
                    <Text size="sm">
                      {t('usage', {
                        spent: money(used?.spent_cents ?? 0),
                        reserved: money(used?.reserved_cents ?? 0),
                        budget: money(p.budget_cents)
                      })}
                    </Text>
                    <Text color="muted" size="sm">
                      {t('projectAccess', {
                        count: data.members.filter(m => m.principal_id === p.id)
                          .length
                      })}
                    </Text>
                  </>
                )}
              </Card>
            )
          })}
          {!data.principals.some(p => p.kind === 'agent') && (
            <Card>
              <Text color="muted">{t('emptyTeam')}</Text>
            </Card>
          )}
        </Stack>
        <Stack gap="lg">
          {params.get('new') === 'agent' ? (
            <Profile key="new" />
          ) : selected?.kind === 'agent' ? (
            <>
              <Profile key={selected.id} person={selected} />
              {selected.adapter !== 'planner' && (
                <Credentials key={selected.id} person={selected} />
              )}
            </>
          ) : (
            <Card gap="md">
              <Icon color="primary" icon="tabler:users-group" size="2em" />
              <Text as="h3" size="xl" weight="semibold">
                {t('teamHintTitle')}
              </Text>
              <Text color="muted">{t('teamHint')}</Text>
              <Text color="muted">{t('adapterHint')}</Text>
            </Card>
          )}
        </Stack>
      </Grid>
    </Stack>
  )
}
