// SPDX-License-Identifier: 0BSD
import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useRef,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'

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
import { useContextTarget } from './useContextTarget'

type MenuProps = BoxProps & {
  children: ReactNode
  componentProps?: {
    button?: ComponentProps<typeof Button>
    icon?: Omit<IconProps, 'icon'>
    menu?: BorderedProps
  }
  customIcon?: string
  onOpenChange?: (open: boolean) => void
  open?: boolean
  buttonComponent?: ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  contextTarget?: RefObject<HTMLElement | null>
}
export function ContextMenu({
  children,
  componentProps,
  customIcon,
  onOpenChange,
  open,
  buttonComponent,
  align = 'end',
  side = 'bottom',
  contextTarget,
  ...triggerProps
}: MenuProps) {
  const [local, setLocal] = useState(false)
  const expanded = open ?? local
  const change = (next: boolean) => {
    if (open === undefined) setLocal(next)
    onOpenChange?.(next)
  }
  const { point, restore } = useContextTarget(contextTarget, () => change(true))
  const pointerSeen = useRef(false)
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  const { t } = useModuleTranslation(['common.buttons'])
  const menu = componentProps?.menu
  const button = componentProps?.button
  const anchor = point && expanded
  const trigger = anchor ? (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      className="monolith-context-anchor"
      style={{ left: point.x, top: point.y }}
    />
  ) : (
    (buttonComponent ?? (
      <Button
        {...button}
        variant={button?.variant ?? 'plain'}
        icon={button?.icon ?? customIcon ?? 'tabler:dots-vertical'}
        iconProps={componentProps?.icon}
        aria-label={button?.['aria-label'] ?? t('moreActions')}
        onPointerDownCapture={event => {
          pointerSeen.current = true
          button?.onPointerDownCapture?.(event)
        }}
        onPointerCancel={event => {
          pointerSeen.current = false
          button?.onPointerCancel?.(event)
        }}
        onClick={event => {
          const fromPointer = pointerSeen.current
          pointerSeen.current = false
          event.stopPropagation()
          button?.onClick?.(event)
          // A WebKit click after a native drag may have no preceding pointer event.
          if (
            !fromPointer &&
            event.detail > 0 &&
            event.button === 0 &&
            !event.ctrlKey &&
            !event.defaultPrevented
          )
            change(!expanded)
        }}
      />
    ))
  )
  return (
    <Menu.Root open={expanded} onOpenChange={change}>
      <Menu.Trigger asChild>
        <Box {...triggerProps} asChild>
          {trigger}
        </Box>
      </Menu.Trigger>
      <Menu.Portal
        container={
          typeof document === 'undefined'
            ? undefined
            : document.getElementById('app')
        }
      >
        <Menu.Content
          asChild
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={16}
          onCloseAutoFocus={event => {
            if (point) {
              event.preventDefault()
              restore()
            }
          }}
        >
          <Bordered
            {...menu}
            className={['monolith-context-menu', menu?.className]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...appearanceVariables(appearance, derivedTheme),
              ...menu?.style
            }}
          >
            {children}
          </Bordered>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
