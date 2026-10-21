// SPDX-License-Identifier: 0BSD
import { type ReactNode, type RefObject, useRef } from 'react'
import { createPortal } from 'react-dom'

import { Scrollbar } from '@/components/layout/Scrollbar'
import { Flex } from '@/components/primitives'
import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import { overlay } from './ModalWrapper.css'
import './modalMotion.css'
import './modalSurface.css'
import { useContextualForm } from './useContextualForm'

export interface ModalWrapperProps {
  isOpen: boolean
  isTopmost?: boolean
  children: ReactNode
  minWidth?: string
  minHeight?: string
  maxWidth?: string
  className?: string
  modalRef?: RefObject<HTMLDivElement | null>
  zIndex?: number
  anchor?: DOMRect
  invoker?: HTMLElement
  onClose?: () => void
  onExited?: () => void
}
export function ModalWrapper(props: ModalWrapperProps) {
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  const surface = useRef<HTMLDivElement>(null)
  const active = props.isTopmost ?? props.isOpen
  useContextualForm(surface, {
    anchor: props.anchor,
    invoker: props.invoker,
    onClose: props.onClose,
    isOpen: props.isOpen,
    isTopmost: active
  })
  if (typeof document === 'undefined') return null

  return createPortal(
    <Flex
      ref={props.modalRef}
      className={overlay({ topmost: active, open: props.isOpen })}
      data-modal-overlay="true"
      data-modal-topmost={active}
      data-open={props.isOpen}
      inert={!active}
      position="fixed"
      inset="0"
      align="center"
      justify="center"
      width="100%"
      height="100dvh"
      minWidth="0"
      zIndex={String(props.zIndex ?? 0)}
      style={appearanceVariables(appearance, derivedTheme)}
      onTransitionEnd={event => {
        if (
          event.currentTarget === event.target &&
          event.propertyName === 'opacity' &&
          !props.isOpen
        )
          props.onExited?.()
      }}
    >
      <Flex
        ref={surface}
        direction="column"
        overflow="hidden"
        p="lg"
        r="xl"
        className={['monolith-modal-surface', props.className]
          .filter(Boolean)
          .join(' ')}
        bg={{ base: 'bg-50', dark: 'bg-900' }}
        width={{ base: '100%', lg: 'auto' }}
        minWidth={props.minWidth ?? '0'}
        minHeight={props.minHeight}
        maxWidth={
          props.maxWidth ?? {
            base: 'calc(100vw - 4rem)',
            sm: 'calc(100vw - 8rem)'
          }
        }
        maxHeight="calc(100dvh - 8rem)"
      >
        <Scrollbar
          autoHeight
          hideHorizontal
          autoHeightMax="calc(100dvh - 11rem)"
        >
          {props.children}
        </Scrollbar>
      </Flex>
    </Flex>,
    document.getElementById('app') ?? document.body
  )
}
