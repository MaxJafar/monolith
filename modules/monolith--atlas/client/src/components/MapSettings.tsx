import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, FloatingPopover, Stack, Text } from '@monolith/ui'
import { useState } from 'react'

import { useAtlas } from '@/AtlasProvider'

export function MapSettings() {
  const a = useAtlas(),
    { t } = useModuleTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <Button
        namespace={false}
        variant="plain"
        icon="lucide:sliders-horizontal"
        className="atlas-icon-button"
        aria-label={t('mapSettings')}
        aria-expanded={!!anchor}
        onClick={event => setAnchor(anchor ? null : event.currentTarget)}
      />
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={t('mapSettings')}
          align="end"
          onClose={() => setAnchor(null)}
        >
          <Stack className="atlas atlas-layers-panel" gap="md">
            <Text as="h3" weight="semibold">
              {t('mapSettings')}
            </Text>
            <Flex as="label" align="center" gap="sm">
              <input
                type="checkbox"
                checked={a.showLabels}
                onChange={event => a.setShowLabels(event.target.checked)}
              />
              <Text size="sm">{t('showLabels')}</Text>
            </Flex>
            <Stack as="label" gap="sm">
              <Text size="sm" color="muted">
                {t('spacing')}
              </Text>
              <input
                type="range"
                min={90}
                max={240}
                step={10}
                value={a.spacing}
                onChange={event => a.setSpacing(Number(event.target.value))}
              />
            </Stack>
            <Stack as="label" gap="sm">
              <Text size="sm" color="muted">
                {t('layers.strength')} · {Math.round(a.layers.strength * 100)}%
              </Text>
              <input
                aria-label={t('layers.strength')}
                type="range"
                min={28}
                max={95}
                step={1}
                value={Math.round(a.layers.strength * 100)}
                onChange={event =>
                  a.setLayers(previous => ({
                    ...previous,
                    strength: Number(event.target.value) / 100
                  }))
                }
              />
            </Stack>
            <Text as="p" size="sm" color="muted" leading="relaxed">
              {t('layers.help')}
            </Text>
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
