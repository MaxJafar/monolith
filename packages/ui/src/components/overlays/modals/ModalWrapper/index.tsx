import { useRef } from 'react'
import { createPortal } from 'react-dom'

import { Scrollbar } from '@/components/layout/Scrollbar'
import { Flex } from '@/components/primitives'
import { Transition } from '@/components/primitives/Transition'
import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import * as styles from './ModalWrapper.css'
import './modalMotion.css'
import { useContextualForm } from './useContextualForm'

export function ModalWrapper({
  isOpen,
  isTopmost = isOpen,
  children,
  className,
  modalRef,
  zIndex = 0,
  onExited,
  anchor,
  invoker,
  onClose
}: {
  isOpen: boolean
  isTopmost?: boolean
  children: React.ReactNode
  minWidth?: string
  minHeight?: string
  maxWidth?: string
  className?: string
  modalRef?: React.RefObject<HTMLDivElement | null>
  zIndex?: number
  onExited?: () => void
  anchor?: DOMRect
  invoker?: HTMLElement
  onClose?: () => void
}) {
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  const surface = useRef<HTMLDivElement>(null)
  useContextualForm(surface, { anchor, invoker, onClose, isOpen, isTopmost })

  return createPortal(
    <Transition
      property={
        isOpen
          ? { property: 'opacity', duration: '200ms', easing: 'ease-out' }
          : [
              {
                property: 'z-index',
                duration: '0.1s',
                easing: 'linear',
                delay: '0.2s'
              },
              { property: 'opacity', duration: '0.2s', easing: 'ease-out' }
            ]
      }
    >
      <Flex
        ref={modalRef}
        align="center"
        className={styles.overlay({ topmost: isTopmost })}
        data-modal-overlay="true"
        data-modal-topmost={isTopmost}
        data-open={isOpen}
        inert={!isTopmost}
        height="100dvh"
        justify="center"
        left="0"
        minWidth="0"
        position="fixed"
        style={{
          ...appearanceVariables(appearance, derivedTheme),
          overscrollBehavior: 'contain',
          opacity: Number(isOpen)
        }}
        top="0"
        width="100%"
        zIndex={zIndex.toString()}
        onTransitionEnd={event => {
          if (
            !isOpen &&
            event.target === event.currentTarget &&
            event.propertyName === 'opacity'
          )
            onExited?.()
        }}
      >
        <Transition easing="ease-out" property="transform">
          <Flex
            ref={surface}
            bg={{ base: 'bg-50', dark: 'bg-900' }}
            className={`monolith-modal-surface ${className ?? ''}`}
            direction="column"
            maxHeight="calc(100dvh - 8rem)"
            maxWidth={{
              base: 'calc(100vw - 4rem)',
              sm: 'calc(100vw - 8rem)'
            }}
            minWidth="0"
            overflow="hidden"
            p="lg"
            r="xl"
            style={{
              transform: !isOpen
                ? 'scale(.97, .95)'
                : isTopmost
                  ? 'none'
                  : 'scale(.97)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            width={{
              lg: 'auto',
              base: '100%'
            }}
          >
            <Scrollbar
              autoHeight
              hideHorizontal
              autoHeightMax="calc(100dvh - 11rem)"
            >
              {children}
            </Scrollbar>
          </Flex>
        </Transition>
      </Flex>
    </Transition>,
    document.getElementById('app') || document.body
  )
}
