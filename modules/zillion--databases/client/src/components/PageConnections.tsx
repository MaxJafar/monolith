import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Stack, Text } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

export function PageConnections({ pageKey }: { pageKey: string }) {
  const { knowledgeIndex, openPage } = useDatabases()
  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()

  const backlinks = knowledgeIndex.backlinks.get(pageKey) ?? []
  const references = knowledgeIndex.references.get(pageKey) ?? []
  const related = knowledgeIndex.related.get(pageKey) ?? []

  return (
    <Card>
      <Stack gap="md">
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Text as="h3" weight="semibold">
            {t('connections.title')}
          </Text>
          <Button
            icon="tabler:circles-relation"
            namespace={false}
            variant="plain"
            onClick={() =>
              setParams({
                section: 'graph',
                focus: pageKey,
                ...(params.get('workspace')
                  ? { workspace: params.get('workspace')! }
                  : {})
              })
            }
          >
            {t('connections.localMap')}
          </Button>
        </Flex>
        {(
          [
            ['backlinks', backlinks],
            ['references', references],
            ['related', related]
          ] as const
        ).map(([label, edges]) => (
          <Stack key={label} gap="xs">
            <Text color="muted" size="sm">
              {t(`connections.${label}`)} · {edges.length}
            </Text>
            {edges.map(edge => {
              const target = knowledgeIndex.nodesByKey.get(
                edge.source === pageKey ? edge.target : edge.source
              )

              return target ? (
                <Button
                  key={edge.id}
                  icon="tabler:arrow-up-right"
                  justify="start"
                  namespace={false}
                  variant="plain"
                  onClick={() => openPage(target)}
                >
                  {target.title}
                  {label === 'related' ? ` · ${edge.label}` : ''}
                </Button>
              ) : null
            })}
          </Stack>
        ))}
        {!backlinks.length && !references.length && !related.length && (
          <Text color="muted" size="sm">
            {t('connections.empty')}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
