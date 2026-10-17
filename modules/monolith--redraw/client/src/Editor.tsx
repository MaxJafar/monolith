import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Stack, Text, surface } from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'

import { CommentsPanel } from './Comments'
import { useEditor } from './EditorProvider'
import { Inspector } from './Inspector'
import { Layers } from './Layers'
import { PrototypePlayer } from './Prototype'
import { EditorHeader, Toolbar } from './Toolbar'
import { Viewport } from './Viewport'
import { exportJSON } from './exports'

export function Editor({ onBack }: { onBack: () => void }) {
  const e = useEditor(),
    { t } = useModuleTranslation()

  const [panel, setPanel] = useState<'layers' | 'properties' | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const [fullscreen, setFullscreen] = useState(false),
    [focusMode, setFocusMode] = useState(false)
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === root.current)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    document.addEventListener('fullscreenchange', change)
    window.addEventListener('keydown', escape)

    return () => {
      document.removeEventListener('fullscreenchange', change)
      window.removeEventListener('keydown', escape)
    }
  }, [])

  async function toggleFullscreen() {
    if (fullscreen) {
      await document.exitFullscreen()

      return
    }

    if (focusMode) {
      setFocusMode(false)

      return
    }

    try {
      if (!root.current?.requestFullscreen) throw Error()
      await root.current.requestFullscreen()
    } catch {
      setFocusMode(true)
    }
  }

  return (
    <Stack
      ref={root}
      className={`redraw redraw-editor${focusMode ? ' redraw-focus-mode' : ''}`}
      gap="none"
      height="100%"
      minHeight="0"
      overflow="hidden"
    >
      <EditorHeader
        fullscreen={fullscreen || focusMode}
        onBack={onBack}
        onFullscreen={() => {
          void toggleFullscreen()
        }}
      />
      {e.blocker.state === 'blocked' && (
        <Flex
          align="center"
          bg={surface.light}
          gap="sm"
          p="md"
          role="alert"
          wrap="wrap"
        >
          <Text>{t('editor.unsavedLeave')}</Text>
          <Button
            variant="secondary"
            onClick={() => {
              if (e.blocker.state === 'blocked') e.blocker.reset()
            }}
          >
            keepEditing
          </Button>
          <Button
            disabled={e.readOnly}
            loading={e.status === 'saving'}
            onClick={async () => {
              if ((await e.flush()) && e.blocker.state === 'blocked')
                e.blocker.proceed()
            }}
          >
            saveAndLeave
          </Button>
          <Button
            dangerous
            disabled={e.status === 'saving'}
            variant="plain"
            onClick={() => {
              if (e.blocker.state === 'blocked') e.blocker.proceed()
            }}
          >
            discardChanges
          </Button>
        </Flex>
      )}
      {e.error && (
        <Flex
          align="center"
          bg={surface.light}
          gap="sm"
          p="sm"
          role="alert"
          wrap="wrap"
        >
          <Text color="dangerous" size="sm">
            {t(`errors.${e.error}`, { defaultValue: e.error })}
          </Text>
          <Button
            disabled={e.readOnly}
            variant="plain"
            onClick={() => {
              void e.persist()
            }}
          >
            retry
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportJSON(e.document, e.title)}
          >
            exportDraft
          </Button>
          <Button variant="plain" onClick={() => e.setError(null)}>
            dismiss
          </Button>
        </Flex>
      )}
      <Toolbar />
      <Flex display={{ base: 'flex', lg: 'none' }} gap="sm" p="sm">
        <Button
          icon="lucide:layers"
          variant={panel === 'layers' ? 'secondary' : 'plain'}
          onClick={() => setPanel(panel === 'layers' ? null : 'layers')}
        >
          layers
        </Button>
        <Button
          icon="lucide:sliders-horizontal"
          variant={panel === 'properties' ? 'secondary' : 'plain'}
          onClick={() => setPanel(panel === 'properties' ? null : 'properties')}
        >
          properties
        </Button>
      </Flex>
      <Flex
        className="redraw-workarea"
        flex="1"
        minHeight="0"
        minWidth="0"
        position="relative"
      >
        <Box
          display={{
            base:
              panel === 'layers' && !e.commentsOpen && e.tool !== 'comment'
                ? 'block'
                : 'none',
            lg: 'block'
          }}
          flexShrink="0"
          height="100%"
          inset={{ base: '0 auto 0 0', lg: 'auto' }}
          position={{ base: 'absolute', lg: 'relative' }}
          width={{ base: 'min(82vw, 19rem)', lg: '13rem' }}
          zIndex="10"
        >
          <Layers />
        </Box>
        <Viewport key={e.pageId} />
        <Box
          display={{
            base:
              e.commentsOpen || (panel === 'properties' && e.tool !== 'comment')
                ? 'block'
                : 'none',
            lg: 'block'
          }}
          flexShrink="0"
          height="100%"
          inset={{ base: '0 0 0 auto', lg: 'auto' }}
          position={{ base: 'absolute', lg: 'relative' }}
          width={{ base: 'min(85vw, 20rem)', lg: '17rem' }}
          zIndex="10"
        >
          {e.commentsOpen ? <CommentsPanel /> : <Inspector />}
        </Box>
      </Flex>
      {e.presenting && <PrototypePlayer />}
    </Stack>
  )
}
