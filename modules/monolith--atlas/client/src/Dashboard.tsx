import { useModuleTranslation } from '@monolith/localization'
import { Bordered, Flex, Grid, Icon, Stack, Text } from '@monolith/ui'
import { Link } from 'react-router'

import { useAtlas } from './AtlasProvider'

export function AtlasOverview() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const source = a.query.data
  const counts = [
    {
      key: 'document',
      label: t('pages'),
      icon: 'lucide:file-text',
      count: source?.nodes.filter(node => node.kind === 'document').length
    },
    {
      key: 'record',
      label: t('records'),
      icon: 'lucide:files',
      count: source?.nodes.filter(node => node.kind === 'record').length
    },
    {
      key: 'database',
      label: t('dashboard.databases'),
      icon: 'lucide:database',
      count: source?.databases?.length ?? 0
    },
    {
      key: 'all',
      label: t('dashboard.connections'),
      icon: 'lucide:link',
      count: source?.edges.length
    }
  ]
  return (
    <Bordered
      asChild
      borderSide="y"
      borderColor={{ base: 'bg-200', dark: 'bg-800' }}
      mb="lg"
      py="lg"
    >
      <Flex
        as="section"
        className="atlas-overview"
        align="center"
        gap="lg"
        wrap="wrap"
        aria-label={t('dashboard.overview')}
      >
        <Stack flex="1 1 240px" gap="xs">
          <Text as="h2" size="xl" weight="medium" tracking="tight">
            {t('welcomeTitle')}
          </Text>
          <Text as="p" color="muted" size="sm" leading="relaxed">
            {t('dashboard.perspective')}
          </Text>
        </Stack>
        <Grid
          className="atlas-overview-counts"
          flex="2 1 480px"
          templateCols={4}
          gap="sm"
        >
          {counts.map(item => (
            <Flex
              as="button"
              key={item.key}
              type="button"
              direction="column"
              align="start"
              gap="sm"
              p="md"
              r="md"
              minWidth="0"
              bg={
                a.filters.kind === item.key && item.key !== 'all'
                  ? { base: 'bg-100', dark: 'bg-800' }
                  : {
                      base: 'transparent',
                      hover: 'bg-100',
                      darkHover: 'bg-800'
                    }
              }
              aria-pressed={
                item.key !== 'all' ? a.filters.kind === item.key : undefined
              }
              onClick={() => {
                a.resetFilters()
                a.setKind(a.filters.kind === item.key ? 'all' : item.key)
              }}
            >
              <Flex align="center" gap="sm">
                <Icon icon={item.icon} size="16px" color="muted" />
                <Text as="strong" size="2xl" weight="medium" tracking="tight">
                  {source ? (item.count ?? 0) : '—'}
                </Text>
              </Flex>
              <Text size="sm" color="muted">
                {item.label}
              </Text>
            </Flex>
          ))}
        </Grid>
      </Flex>
    </Bordered>
  )
}

export function DatabaseCollections() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const databases = a.query.data?.databases ?? []
  return (
    <section
      className="atlas-collections"
      aria-label={t('dashboard.databases')}
    >
      <div className="atlas-pane-heading">
        <span>{t('dashboard.databases')}</span>
        <Link to={`/databases?workspace=${a.workspace.id}`}>
          {t('dashboard.openDatabases')}
        </Link>
      </div>
      <p className="atlas-muted">{t('dashboard.databaseHelp')}</p>
      <div className="atlas-collection-list">
        {databases.map(database => (
          <div className="atlas-collection" key={database.id}>
            <Link to={database.href}>
              <Icon icon="lucide:database" size="19px" />
              <span>
                <strong>{database.title}</strong>
                <small>
                  {t('dashboard.collectionCount', {
                    count: database.recordIds.length,
                    embeds: database.embeddedIn.length
                  })}
                </small>
              </span>
              <Icon icon="lucide:arrow-up-right" size="15px" />
            </Link>
            <button
              type="button"
              aria-label={t('dashboard.exploreDatabase', {
                title: database.title
              })}
              onClick={() => {
                a.explore(`database:${database.id}`)
                document
                  .querySelector('.atlas-map-section')
                  ?.scrollIntoView({ block: 'start' })
              }}
            >
              <Icon icon="lucide:network" size="16px" />
            </button>
          </div>
        ))}
        {!databases.length && (
          <p className="atlas-no-results">{t('dashboard.emptyDatabases')}</p>
        )}
      </div>
    </section>
  )
}
