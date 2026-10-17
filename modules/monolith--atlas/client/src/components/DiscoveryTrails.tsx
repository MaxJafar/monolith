import { useModuleTranslation } from '@monolith/localization'
import { Bordered, Box, Flex, Grid, Icon, Stack, Text } from '@monolith/ui'

import { useAtlas } from '@/AtlasProvider'
import { entityType, isPage } from '@/model'

export function DiscoveryTrails() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const trails = a.visible.matches
    .filter(
      node =>
        (isPage(node) || node.kind === 'database') &&
        (a.index.neighbors.get(node.key)?.size ?? 0) > 0
    )
    .sort(
      (aNode, bNode) =>
        (a.index.neighbors.get(bNode.key)?.size ?? 0) -
          (a.index.neighbors.get(aNode.key)?.size ?? 0) ||
        aNode.title.localeCompare(bNode.title)
    )
    .slice(0, 3)

  if (!trails.length) return null

  return (
    <Stack as="section" gap="md" mt="lg" aria-label={t('dashboard.trails')}>
      <Flex align="baseline" justify="between" gap="sm" wrap="wrap">
        <Text as="h2" size="lg" weight="medium">
          {t('dashboard.trails')}
        </Text>
        <Text size="sm" color="muted">
          {t('dashboard.trailsHint')}
        </Text>
      </Flex>
      <Grid className="atlas-trails" templateCols={{ base: 1, lg: 3 }} gap="md">
        {trails.map((node, index) => (
          <Bordered
            key={node.key}
            asChild
            borderColor={{ base: 'bg-200', dark: 'bg-800' }}
            r="lg"
          >
            <Flex
              as="button"
              className="atlas-trail"
              type="button"
              p="md"
              gap="md"
              align="center"
              minWidth="0"
              bg={{ base: 'transparent', hover: 'bg-100', darkHover: 'bg-800' }}
              onClick={() => {
                a.explore(node.key)
                document
                  .querySelector('.atlas-map-section')
                  ?.scrollIntoView({ block: 'start' })
              }}
            >
              <Text size="lg" color="muted" weight="medium">
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Stack flex="1" gap="xs" minWidth="0">
                <Text size="sm" color="muted">
                  {t(`entity.${entityType(node)}`)}
                </Text>
                <Text weight="medium" truncate>
                  {node.title}
                </Text>
                <Text size="sm" color="muted">
                  {t('connectionCount', {
                    count: a.index.neighbors.get(node.key)?.size ?? 0
                  })}
                </Text>
              </Stack>
              <Box flexShrink="0">
                <Icon icon="lucide:arrow-up-right" size="18px" color="muted" />
              </Box>
            </Flex>
          </Bordered>
        ))}
      </Grid>
    </Stack>
  )
}
