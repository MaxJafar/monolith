import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Icon, Stack, Text, surface } from '@monolith/ui'

import { ComponentLibrary } from './DesignPanels'
import { useEditor } from './EditorProvider'
import { selectionIds } from './model'

const icons: Record<string, string> = {
  frame: 'lucide:frame',
  rectangle: 'lucide:square',
  ellipse: 'lucide:circle',
  diamond: 'lucide:diamond',
  text: 'lucide:type',
  sticky: 'lucide:sticky-note',
  node: 'lucide:network',
  path: 'lucide:pencil',
  image: 'lucide:image'
}

export function Layers() {
  const e = useEditor(),
    { t } = useModuleTranslation()

  return (
    <Stack
      aria-label={t('editor.layers')}
      as="aside"
      bg={surface.default}
      gap="md"
      height="100%"
      overflowY="auto"
      p="sm"
    >
      <Flex align="center" justify="between">
        <Text size="sm" weight="semibold">
          {t('editor.pages')}
        </Text>
        <Button
          aria-label={t('editor.addPage')}
          disabled={e.readOnly}
          icon="lucide:plus"
          variant="plain"
          onClick={() =>
            e.addPage(
              e.page.mode,
              `${t(`modes.${e.page.mode}`)} ${e.document.pages.filter(p => p.mode === e.page.mode).length + 1}`
            )
          }
        />
      </Flex>
      <Stack gap="xs">
        {e.document.pages.map(page => (
          <Button
            key={page.id}
            aria-current={page.id === e.pageId ? 'page' : undefined}
            icon={
              page.mode === 'blackboard' ? 'lucide:network' : 'lucide:pen-tool'
            }
            justify="start"
            namespace={false}
            variant={page.id === e.pageId ? 'secondary' : 'plain'}
            onClick={() => e.choosePage(page.id)}
          >
            <Text truncate size="sm">
              {page.name}
            </Text>
          </Button>
        ))}
      </Stack>
      <Flex align="center" justify="between">
        <Text size="sm" weight="semibold">
          {t('editor.layers')}
        </Text>
        <Text color="muted" size="sm">
          {e.page.elements.length}
        </Text>
      </Flex>
      {!e.page.elements.length && (
        <Text color="muted" size="sm">
          {t('editor.emptyLayers')}
        </Text>
      )}
      <Stack gap="xs">
        {[...e.page.elements].reverse().map(element => (
          <Flex
            key={element.id}
            align="center"
            bg={e.selected.includes(element.id) ? surface.light : 'transparent'}
            data-layer={element.id}
            gap="xs"
            r="sm"
          >
            <Box flex="1" minWidth="0">
              <Button
                aria-pressed={e.selected.includes(element.id)}
                justify="start"
                namespace={false}
                p="xs"
                variant="plain"
                width="100%"
                onClick={event =>
                  e.setSelected(
                    event.shiftKey
                      ? [...new Set([...e.selected, element.id])]
                      : selectionIds(e.page, element.id)
                  )
                }
                onDoubleClick={() => e.setSelected([element.id])}
              >
                <Icon icon={icons[element.kind]!} />
                <Text
                  truncate
                  color={
                    element.hidden
                      ? 'muted'
                      : { base: 'bg-800', dark: 'bg-100' }
                  }
                  size="sm"
                >
                  {element.name}
                </Text>
              </Button>
            </Box>
            <Button
              aria-label={t(element.hidden ? 'editor.show' : 'editor.hide', {
                name: element.name
              })}
              disabled={e.readOnly}
              icon={element.hidden ? 'lucide:eye-off' : 'lucide:eye'}
              p="xs"
              variant="plain"
              onClick={() =>
                e.changeElements(
                  [element.id],
                  { hidden: !element.hidden },
                  true
                )
              }
            />
            <Button
              aria-label={t(element.locked ? 'editor.unlock' : 'editor.lock', {
                name: element.name
              })}
              disabled={e.readOnly}
              icon={element.locked ? 'lucide:lock' : 'lucide:unlock'}
              p="xs"
              variant="plain"
              onClick={() =>
                e.changeElements(
                  [element.id],
                  { locked: !element.locked },
                  true
                )
              }
            />
          </Flex>
        ))}
        {e.page.connectors.map(edge => (
          <Button
            key={edge.id}
            icon="lucide:git-branch"
            justify="start"
            namespace={false}
            variant={e.selected.includes(edge.id) ? 'secondary' : 'plain'}
            onClick={() => e.setSelected([edge.id])}
          >
            <Text truncate size="sm">
              {edge.label || t('tools.connect')}
            </Text>
          </Button>
        ))}
      </Stack>
      <ComponentLibrary />
      <Text color="muted" id="redraw-keys" size="sm">
        {t('editor.shortcuts')}
      </Text>
    </Stack>
  )
}
