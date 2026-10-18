import { useModuleTranslation } from '@monolith/localization'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/inputs'
import {
  Bordered,
  type BorderedProps,
  Box,
  type BoxProps,
  type IconProps
} from '@/components/primitives'
import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import './menu.css'

interface MenuProps extends BoxProps {
  /** The content to be displayed inside the menu. Typically one or more `<ContextMenuItem>` components. */
  children: React.ReactNode
  /** Optional props for styling different parts of the menu component. */
  componentProps?: {
    button?: React.ComponentProps<typeof Button>
    icon?: Omit<IconProps, 'icon'>
    menu?: BorderedProps
  }
  /** The icon identifier from Iconify to replace the default hamburger menu icon. */
  customIcon?: string
  /** Callback function called when the menu open state changes. */
  onOpenChange?: (open: boolean) => void
  open?: boolean
  /** Custom React component to use as the menu trigger button instead of the default three-dots button. */
  buttonComponent?: React.ReactNode
  /** The horizontal alignment of the menu relative to the trigger button. */
  align?: 'start' | 'center' | 'end'
  /** The side of the trigger button where the menu should appear. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** The owning row or card, enabling the same actions with right click / Shift+F10. */
  contextTarget?: React.RefObject<HTMLElement | null>
}

export function ContextMenu({
  children,
  componentProps,
  customIcon,
  buttonComponent,
  onOpenChange,
  open,
  align = 'end',
  side = 'bottom',
  contextTarget,
  ...rest
}: MenuProps) {
  const { t } = useModuleTranslation(['common.buttons'])
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  const [localOpen, setLocalOpen] = useState(false)
  const pointerPress = useRef(false)
  const [point, setPoint] = useState<{ x: number; y: number }>()
  const restoreFocus = useRef<HTMLElement | null>(null)

  const expanded = open ?? localOpen
  const changeOpen = (value: boolean) => {
    if (open === undefined) setLocalOpen(value)
    onOpenChange?.(value)
  }
  const change = useRef(changeOpen)
  change.current = changeOpen
  useEffect(() => {
    const target = contextTarget?.current
    if (!target) return
    const openAt = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent &&
        !(
          event.key === 'ContextMenu' ||
          (event.shiftKey && event.key === 'F10')
        )
      )
        return
      event.preventDefault()
      event.stopPropagation()
      restoreFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : target
      const rect = target.getBoundingClientRect()
      setPoint(
        event instanceof MouseEvent
          ? { x: event.clientX, y: event.clientY }
          : { x: rect.left + 24, y: rect.bottom }
      )
      change.current(true)
    }
    target.addEventListener('contextmenu', openAt)
    target.addEventListener('keydown', openAt)
    return () => {
      target.removeEventListener('contextmenu', openAt)
      target.removeEventListener('keydown', openAt)
    }
  }, [contextTarget])

  return (
    <DropdownMenuPrimitive.Root open={expanded} onOpenChange={changeOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        <Box asChild {...rest}>
          {point && expanded ? (
            <button
              aria-hidden
              tabIndex={-1}
              className="monolith-context-anchor"
              style={{ left: point.x, top: point.y }}
            />
          ) : (
            buttonComponent || (
              <Button
                aria-label={t('moreActions')}
                icon={customIcon ?? 'tabler:dots-vertical'}
                iconProps={componentProps?.icon}
                tabIndex={0}
                variant="plain"
                {...componentProps?.button}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  const pointerHandled = pointerPress.current
                  pointerPress.current = false
                  e.stopPropagation()
                  componentProps?.button?.onClick?.(e)
                  // WebKit can emit a mouse-only click after native dragging.
                  // Normal pointer and keyboard activation remain owned by Radix.
                  if (
                    !pointerHandled &&
                    e.detail > 0 &&
                    e.button === 0 &&
                    !e.ctrlKey &&
                    !e.defaultPrevented
                  )
                    changeOpen(!expanded)
                }}
                onPointerCancel={(
                  event: React.PointerEvent<HTMLButtonElement>
                ) => {
                  pointerPress.current = false
                  componentProps?.button?.onPointerCancel?.(event)
                }}
                onPointerDownCapture={(
                  event: React.PointerEvent<HTMLButtonElement>
                ) => {
                  pointerPress.current = true
                  componentProps?.button?.onPointerDownCapture?.(event)
                }}
              />
            )
          )}
        </Box>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal container={document.getElementById('app')}>
        <DropdownMenuPrimitive.Content
          asChild
          avoidCollisions
          align={align}
          alignOffset={0}
          collisionPadding={16}
          side={side}
          sideOffset={6}
          onCloseAutoFocus={event => {
            if (point) {
              event.preventDefault()
              restoreFocus.current?.focus({ preventScroll: true })
              setPoint(undefined)
            }
          }}
        >
          <Bordered
            bg={{ base: 'bg-50', dark: 'bg-800' }}
            borderColor={{ base: 'bg-200', dark: 'bg-700' }}
            minWidth="14rem"
            overflow="hidden"
            r="lg"
            zIndex="9999"
            p="xs"
            {...componentProps?.menu}
            className={`monolith-context-menu ${componentProps?.menu?.className ?? ''}`}
            style={{
              ...appearanceVariables(appearance, derivedTheme),
              width: 'var(--radix-popper-anchor-width)',
              ...componentProps?.menu?.style
            }}
          >
            {children}
          </Bordered>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
