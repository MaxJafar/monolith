import type { Appearance } from '@monolith/blocks'
import {
  AppearanceContext,
  Button,
  Flex,
  type PageOpenMode,
  appearanceVariables,
  useAppearance,
  usePageOpenPreference,
  usePersonalization
} from '@monolith/ui'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/** A single presentation for records opened from any database layout or embed. */
export function RecordSurface({
  children,
  appearance = {},
  closing = false,
  toolbar
}: {
  children: ReactNode
  toolbar?: ReactNode
  appearance?: Appearance
  closing?: boolean
}) {
  const inherited = useAppearance().appearance
  const mergedAppearance = { ...inherited, ...appearance }
  const { derivedTheme } = usePersonalization()
  const [preferred] = usePageOpenPreference()
  const [mode, setMode] = useState<PageOpenMode>(preferred)
  const root = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('common.workspaceUI')
  const portalTarget =
    document.getElementById('workspace-tab-panel') ?? document.body
  useEffect(() => {
    const previous = document.activeElement
    root.current?.focus({ preventScroll: true })
    function keydown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        document.querySelector(
          '[data-modal-topmost="true"], [role="menu"], [role="listbox"],.monolith-floating-surface'
        )
      )
        return
      const surface = root.current
      if (
        !surface ||
        document
          .querySelectorAll('.database-record-surface')
          .item(
            document.querySelectorAll('.database-record-surface').length - 1
          ) !== surface
      )
        return
      if (event.key === 'Escape') {
        event.preventDefault()
        surface.querySelector<HTMLButtonElement>('[data-close-record]')?.click()
      }
      if (event.key === 'Tab' && mode === 'overlay') {
        const controls = Array.from(
          surface.querySelectorAll<HTMLElement>(
            'button,a[href],input,textarea,[tabindex="0"]'
          )
        ).filter(
          el => el.getClientRects().length && !el.hasAttribute('disabled')
        )
        const first = controls[0],
          last = controls[controls.length - 1]
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === surface)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === surface)
        ) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    function focus(event: FocusEvent) {
      const surface = root.current
      if (
        !surface ||
        mode !== 'overlay' ||
        document.querySelector(
          '[data-modal-topmost="true"],[role="menu"],[role="listbox"],.monolith-floating-surface,.database-settings-panel'
        )
      )
        return
      if (
        document
          .querySelectorAll('.database-record-surface')
          .item(
            document.querySelectorAll('.database-record-surface').length - 1
          ) !== surface
      )
        return
      if (event.target instanceof Node && !surface.contains(event.target))
        surface.focus({ preventScroll: true })
    }
    document.addEventListener('focusin', focus)
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', focus)
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true })
    }
  }, [mode])
  return createPortal(
    <AppearanceContext value={{ appearance: mergedAppearance, readOnly: true }}>
      <div
        className="database-record-backdrop"
        style={appearanceVariables(mergedAppearance, derivedTheme)}
        data-mode={mode}
        data-closing={closing || undefined}
        data-contained={portalTarget !== document.body}
        onPointerDown={event => {
          if (event.target === event.currentTarget)
            root.current
              ?.querySelector<HTMLButtonElement>('[data-close-record]')
              ?.click()
        }}
      >
        <div
          ref={root}
          className="database-record-surface"
          role="dialog"
          aria-modal={mode === 'overlay'}
          aria-label={t('pagePreview')}
          tabIndex={-1}
        >
          <div className="database-record-chrome">
            <Flex
              className="database-record-presentation"
              gap="xs"
              justify="start"
            >
              {(['side', 'overlay', 'full'] as const).map(value => (
                <Button
                  key={value}
                  namespace={false}
                  variant="plain"
                  icon={
                    value === 'side'
                      ? 'lucide:panel-right'
                      : value === 'full'
                        ? 'lucide:maximize-2'
                        : 'lucide:panels-top-left'
                  }
                  aria-label={t(`pageOpen.${value}`)}
                  title={t(`pageOpen.${value}`)}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                />
              ))}
            </Flex>
            {toolbar}
          </div>
          {children}
        </div>
      </div>
    </AppearanceContext>,
    portalTarget
  )
}
