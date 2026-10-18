import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Text, TextInput, surface } from '@monolith/ui'
import { useRef, useState } from 'react'

import { PresenceBar } from './DesignPanels'
import { useEditor } from './EditorProvider'
import { exportJSON, exportPage, readImage } from './exports'
import { type Tool, makeElement, toWorld } from './model'

const tools: { id: Tool; icon: string; mode?: 'blackboard' | 'canvas' }[] = [
  { id: 'select', icon: 'lucide:mouse-pointer-2' },
  { id: 'hand', icon: 'lucide:hand' },
  { id: 'node', icon: 'lucide:network', mode: 'blackboard' },
  { id: 'sticky', icon: 'lucide:sticky-note', mode: 'blackboard' },
  { id: 'connect', icon: 'lucide:git-branch', mode: 'blackboard' },
  { id: 'frame', icon: 'lucide:frame', mode: 'canvas' },
  { id: 'rectangle', icon: 'lucide:square' },
  { id: 'ellipse', icon: 'lucide:circle' },
  { id: 'diamond', icon: 'lucide:diamond' },
  { id: 'text', icon: 'lucide:type' },
  { id: 'pen', icon: 'lucide:pen-tool' },
  { id: 'path', icon: 'lucide:pencil' }
]

export function EditorHeader({
  onBack,
  fullscreen,
  onFullscreen
}: {
  onBack: () => void
  fullscreen: boolean
  onFullscreen: () => void
}) {
  const e = useEditor(),
    { t } = useModuleTranslation()
  const [exporting, setExporting] = useState(false),
    [menu, setMenu] = useState(false)

  return (
    <Flex
      align="center"
      bg={surface.default}
      gap="sm"
      justify="between"
      p="sm"
      wrap="wrap"
    >
      <Flex
        align="center"
        flex={{ base: '1 0 100%', lg: '1 1 21rem' }}
        gap="sm"
        minWidth={{ base: '0', lg: '20rem' }}
      >
        <Button
          aria-label={t('editor.back')}
          icon="lucide:arrow-left"
          variant="plain"
          onClick={onBack}
        />
        <Box flex="1" maxWidth="22rem" minWidth="8rem">
          <TextInput
            disabled={e.readOnly}
            label="projectTitle"
            maxLength={160}
            placeholder={t('inputs.projectTitle.placeholder')}
            value={e.title}
            variant="plain"
            onChange={e.setTitle}
          />
        </Box>
        <Box flexShrink="0" maxWidth="9rem">
          <Text
            color={e.status === 'error' ? 'dangerous' : 'muted'}
            role="status"
            size="sm"
          >
            {t(
              `save.${e.readOnly ? 'readOnly' : e.status === 'saving' ? 'saving' : e.status === 'error' ? 'error' : e.dirty ? 'unsaved' : 'saved'}`
            )}
          </Text>
        </Box>
      </Flex>
      <PresenceBar />
      <Flex align="center" bg={surface.light} gap="xs" p="xs" r="md">
        {(['blackboard', 'canvas'] as const).map(mode => (
          <Button
            key={mode}
            aria-label={t(`modes.${mode}`)}
            aria-pressed={e.page.mode === mode}
            disabled={
              e.readOnly && !e.document.pages.some(p => p.mode === mode)
            }
            icon={mode === 'blackboard' ? 'lucide:network' : 'lucide:pen-tool'}
            namespace={false}
            title={t(`modes.${mode}`)}
            variant={e.page.mode === mode ? 'secondary' : 'plain'}
            onClick={() => e.switchMode(mode, t(`modes.${mode}`))}
          >
            <Text display={{ base: 'none', sm: 'inline' }}>
              {t(`modes.${mode}`)}
            </Text>
          </Button>
        ))}
      </Flex>
      <Flex
        align="center"
        gap="xs"
        maxWidth="100%"
        position="relative"
        wrap="wrap"
      >
        <Button
          aria-label={t('buttons.comments')}
          aria-pressed={e.commentsOpen}
          icon="lucide:message-circle"
          variant="plain"
          onClick={() => e.setCommentsOpen(!e.commentsOpen)}
        />
        <Button
          aria-label={t('buttons.present')}
          icon="lucide:play"
          variant="plain"
          onClick={() => e.setPresenting(true)}
        />
        <Button
          aria-label={t(
            fullscreen ? 'buttons.exitFullscreen' : 'buttons.fullscreen'
          )}
          aria-pressed={fullscreen}
          icon="lucide:maximize"
          variant="plain"
          onClick={onFullscreen}
        />
        <Button
          aria-label={t('editor.undo')}
          disabled={e.readOnly || !e.canUndo}
          icon="lucide:undo-2"
          variant="plain"
          onClick={() => e.history('undo')}
        />
        <Button
          aria-label={t('editor.redo')}
          disabled={e.readOnly || !e.canRedo}
          icon="lucide:redo-2"
          variant="plain"
          onClick={() => e.history('redo')}
        />
        <Button
          aria-label={t('buttons.save')}
          disabled={e.readOnly || !e.dirty}
          icon="lucide:save"
          loading={e.status === 'saving'}
          namespace={false}
          variant="secondary"
          onClick={() => {
            void e.persist()
          }}
        >
          <Text display={{ base: 'none', sm: 'inline' }}>
            {t('buttons.save')}
          </Text>
        </Button>
        <Button
          aria-expanded={menu}
          aria-label={t('buttons.export')}
          icon="lucide:download"
          namespace={false}
          variant="primary"
          onClick={() => setMenu(!menu)}
        >
          <Text display={{ base: 'none', sm: 'inline' }}>
            {t('buttons.export')}
          </Text>
        </Button>
        {menu && (
          <Box
            shadow
            bg={surface.default}
            p="sm"
            position="absolute"
            r="md"
            right="0"
            top="100%"
            zIndex="20"
            onKeyDown={event => {
              if (event.key === 'Escape') setMenu(false)
            }}
          >
            <Flex direction="column" gap="xs" minWidth="11rem">
              <Button
                variant="plain"
                onClick={() => {
                  exportJSON(e.document, e.title)
                  setMenu(false)
                }}
              >
                exportJson
              </Button>
              {(['svg', 'png'] as const).map(format => (
                <Button
                  key={format}
                  loading={exporting}
                  namespace={false}
                  variant="plain"
                  onClick={async () => {
                    setExporting(true)

                    try {
                      await exportPage(e.page, e.title, format)
                      setMenu(false)
                    } catch {
                      e.setError('exportFailed')
                    } finally {
                      setExporting(false)
                    }
                  }}
                >
                  {format.toUpperCase()}
                </Button>
              ))}
            </Flex>
          </Box>
        )}
      </Flex>
    </Flex>
  )
}

export function Toolbar() {
  const e = useEditor(),
    { t } = useModuleTranslation(),
    imageInput = useRef<HTMLInputElement>(null)

  return (
    <Flex
      align="center"
      bg={surface.default}
      flexShrink="0"
      gap="sm"
      justify="between"
      overflowX="auto"
      p="sm"
    >
      <Flex
        align="center"
        aria-label={t('editor.tools')}
        flexShrink="0"
        gap="xs"
        role="toolbar"
      >
        {tools
          .filter(tool => !tool.mode || tool.mode === e.page.mode)
          .map(tool => (
            <Button
              key={tool.id}
              aria-label={t(`tools.${tool.id}`)}
              aria-pressed={e.tool === tool.id}
              disabled={
                e.readOnly && tool.id !== 'select' && tool.id !== 'hand'
              }
              icon={tool.icon}
              title={t(`tools.${tool.id}`)}
              variant={e.tool === tool.id ? 'secondary' : 'plain'}
              onClick={() => {
                e.setTool(tool.id)
                e.setConnectionStart(null)
              }}
            />
          ))}
        <Button
          aria-label={t('tools.image')}
          disabled={e.readOnly}
          icon="lucide:image"
          title={t('tools.image')}
          variant="plain"
          onClick={() => imageInput.current?.click()}
        />
        <input
          ref={imageInput}
          hidden
          accept="image/png,image/jpeg,image/webp"
          type="file"
          onChange={async event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return

            const targetPageId = e.pageId,
              point = toWorld({ x: 200, y: 180 }, e.view)

            try {
              const content = await readImage(file)
              const element = {
                ...makeElement('image', point, file.name.slice(0, 160)),
                ...content
              }
              e.insertElement(targetPageId, element)
            } catch (error) {
              e.setError(
                error instanceof Error ? error.message : 'importFailed'
              )
            }
          }}
        />
      </Flex>
      <Flex align="center" flexShrink="0" gap="xs">
        {e.page.mode === 'blackboard' && (
          <Button
            disabled={e.readOnly || !e.page.elements.length}
            icon="lucide:workflow"
            variant="plain"
            onClick={e.autoLayout}
          >
            arrange
          </Button>
        )}
        <Button
          aria-label={t('editor.grid')}
          aria-pressed={e.grid}
          icon="lucide:grid-2x2"
          variant={e.grid ? 'secondary' : 'plain'}
          onClick={() => e.setGrid(!e.grid)}
        />
        <Button
          aria-label={t('editor.snap')}
          aria-pressed={e.snap}
          icon="lucide:magnet"
          variant={e.snap ? 'secondary' : 'plain'}
          onClick={() => e.setSnap(!e.snap)}
        />
      </Flex>
    </Flex>
  )
}
