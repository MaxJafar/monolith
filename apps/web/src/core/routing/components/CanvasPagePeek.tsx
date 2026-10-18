import { resolveAppearance } from '@monolith/blocks'
import {
  AppearanceContext,
  Box,
  Button,
  Flex,
  PageChromeProvider,
  Text,
  appearanceVariables,
  usePageChrome,
  useAnimatedClose,
  usePersonalization
} from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'

import CanvasPageRoute from './CanvasPageRoute'
import './pagePeek.css'

export default function CanvasPagePeek(props: {
  id: string
  workspace: string
  locationLabel: string
  onClose: () => void
}) {
  return (
    <PageChromeProvider>
      <PagePeekBody {...props} />
    </PageChromeProvider>
  )
}

function PagePeekBody({
  id,
  workspace,
  locationLabel,
  onClose: finishClose
}: {
  id: string
  workspace: string
  locationLabel: string
  onClose: () => void
}) {
  const { closing, close: onClose } = useAnimatedClose(finishClose)
  const { t } = useTranslation('common')
  const chrome = usePageChrome()
  const appAppearance = useAppAppearance()
  const { derivedTheme } = usePersonalization()
  const appearance = resolveAppearance(
    appAppearance.global,
    appAppearance.workspace,
    appAppearance.pages[`/page/${id}`]
  )
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  const dirty = useRef(false)
  dirty.current = !!chrome?.document?.dirty
  close.current = onClose
  const [mode, setMode] = useState<'center' | 'side'>('center')
  const modeRef = useRef(mode)
  modeRef.current = mode
  const navigate = useNavigate()
  useEffect(() => {
    const previous = document.activeElement
    const root = ref.current!
    let focused = false
    const focusTitle = () => {
      const input = root.querySelector<HTMLInputElement>(
        '.canvas-inline-page-title,.monolith-document-title'
      )
      if (!input || focused) return
      focused = true
      input.focus()
      input.select()
    }
    const observer = new MutationObserver(focusTitle)
    observer.observe(root, { subtree: true, childList: true })
    focusTitle()
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (
        document.querySelector(
          '.monolith-floating-surface,.zillion-editor-menu,.database-record-backdrop,[data-radix-popper-content-wrapper]'
        )
      )
        return
      if (
        event.key === 'Escape' &&
        !dirty.current &&
        (modeRef.current === 'center' || root.contains(document.activeElement))
      ) {
        event.preventDefault()
        close.current()
      }
      if (event.key === 'Tab' && modeRef.current === 'center') {
        const items = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,textarea,[contenteditable="true"],[tabindex="0"]'
          )
        ).filter(element => element.getClientRects().length)
        const first = items[0],
          last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', keyboard)
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus()
    }
  }, [id])
  return createPortal(
    <AppearanceContext value={{ appearance }}>
      <Box
        className="monolith-page-peek-backdrop"
        data-mode={mode}
        data-closing={closing || undefined}
        onPointerDown={event => {
          if (event.target === event.currentTarget && !dirty.current) onClose()
        }}
      >
        <Flex
          ref={ref}
          className="monolith-page-peek"
          data-mode={mode}
          role="dialog"
          aria-modal={mode === 'center'}
          aria-label={t('navigation.newPage')}
          direction="column"
          style={appearanceVariables(appearance, derivedTheme)}
        >
          <Flex
            className="monolith-page-peek-toolbar"
            gap="xs"
            align="center"
            px="sm"
            py="xs"
          >
            <Button
              icon="lucide:expand"
              variant="plain"
              p="xs"
              aria-label={t('workspaceUI.openFullPage')}
              disabled={!!chrome?.document?.dirty}
              onClick={() => {
                navigate(`/page/${id}?workspace=${workspace}`)
                onClose()
              }}
            />
            <Button
              icon="lucide:panel-right"
              variant="plain"
              p="xs"
              aria-label={t('workspaceUI.sidePeek')}
              aria-pressed={mode === 'side'}
              onClick={() => setMode(mode === 'center' ? 'side' : 'center')}
            />
            <Text size="sm" color="muted">
              {locationLabel}
            </Text>
            <Box flex="1" />
            <Text size="xs" color="muted" role="status">
              {chrome?.document?.status}
            </Text>
            <Button
              icon="lucide:x"
              variant="plain"
              p="xs"
              aria-label={t('buttons.close')}
              disabled={!!chrome?.document?.dirty}
              onClick={onClose}
            />
          </Flex>
          <CanvasPageRoute pageId={id} />
        </Flex>
      </Box>
    </AppearanceContext>,
    document.getElementById('workspace-tab-panel') ?? document.body
  )
}
