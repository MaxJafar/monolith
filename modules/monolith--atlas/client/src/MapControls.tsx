import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Grid,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'

import { useAtlas } from './AtlasProvider'
import { entityHues, entityKinds, entityType } from './model'

export function MapControls() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const counts = new Map<string, number>()

  for (const node of a.graph.nodes)
    counts.set(entityType(node), (counts.get(entityType(node)) ?? 0) + 1)

  return (
    <>
      <Button
        namespace={false}
        variant="plain"
        icon="lucide:layers"
        className="atlas-layers-trigger"
        aria-expanded={!!anchor}
        onClick={event => setAnchor(anchor ? null : event.currentTarget)}
      >
        {t('layers.title')}
      </Button>
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          align="end"
          label={t('layers.title')}
          onClose={() => setAnchor(null)}
        >
          <Stack className="atlas atlas-layers-panel" gap="md">
            <Text as="h3" size="base" weight="semibold">
              {t('layers.title')}
            </Text>
            <Flex aria-label={t('layers.title')} gap="sm" wrap="wrap">
              {(['tags', 'topics', 'context'] as const).map(layer => (
                <Button
                  key={layer}
                  namespace={false}
                  variant={a.layers[layer] ? 'secondary' : 'plain'}
                  px="sm"
                  py="sm"
                  aria-pressed={a.layers[layer]}
                  type="button"
                  onClick={() =>
                    a.setLayers(previous => ({
                      ...previous,
                      [layer]: !previous[layer]
                    }))
                  }
                >
                  <span className={`atlas-layer-symbol atlas-layer-${layer}`} />
                  {t(`layers.${layer}`)}
                </Button>
              ))}
            </Flex>
            <Flex as="label" align="center" justify="between" gap="md">
              <Text size="sm" color="muted">
                {t('colors.title')}
              </Text>
              <Box width="auto" minWidth="0">
                <select
                  aria-label={t('colors.title')}
                  value={a.layers.colors}
                  onChange={event =>
                    a.setLayers(previous => ({
                      ...previous,
                      colors: event.target.value as 'type' | 'individual'
                    }))
                  }
                >
                  <option value="individual">{t('colors.individual')}</option>
                  <option value="type">{t('colors.type')}</option>
                </select>
              </Box>
            </Flex>
            <Grid aria-label={t('legend')} templateCols={2} gap="xs">
              {entityKinds
                .filter(kind => counts.has(kind))
                .map(kind => (
                  <Button
                    key={kind}
                    namespace={false}
                    variant={a.filters.kind === kind ? 'secondary' : 'plain'}
                    justify="start"
                    gap="sm"
                    px="sm"
                    minWidth="0"
                    aria-pressed={a.filters.kind === kind}
                    type="button"
                    onClick={() =>
                      a.setKind(a.filters.kind === kind ? 'all' : kind)
                    }
                  >
                    <Box
                      as="span"
                      width="8px"
                      height="8px"
                      flexShrink="0"
                      r="full"
                      style={{
                        backgroundColor:
                          a.layers.colors === 'type'
                            ? `hsl(${entityHues[kind]} 65% 50%)`
                            : 'var(--atlas-muted)'
                      }}
                    />
                    <Text size="sm">{t(`entity.${kind}`)}</Text>
                    <Text size="sm" color="muted">
                      {counts.get(kind)}
                    </Text>
                  </Button>
                ))}
            </Grid>
            <Text as="p" color="muted" size="sm" leading="relaxed">
              {t('dashboard.layerHint')}
            </Text>
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
