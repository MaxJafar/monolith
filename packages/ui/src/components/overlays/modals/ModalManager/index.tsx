// SPDX-License-Identifier: 0BSD
import { useCallback, useEffect } from 'react'

import { ModuleMetadataProvider } from '@monolith/federation'

import { useModalStore } from '@/providers'
import type { ModalInstance } from '@/providers/ModalProvider'

import { ModalWrapper } from '../ModalWrapper'
import './entry.css'
import { scheduleModalExit } from './modalExit'

function ManagedLayer({
  item,
  index,
  active
}: {
  item: ModalInstance
  index: number
  active: boolean
}) {
  const { close, remove } = useModalStore()
  const dismiss = useCallback(() => close(item.id), [close, item.id])
  const finish = useCallback(() => {
    if (item.isClosing) remove(item.id)
  }, [remove, item.id, item.isClosing])
  useEffect(() => {
    if (!item.isClosing) return
    return scheduleModalExit(
      () => remove(item.id),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [item.id, item.isClosing, remove])
  const Content = item.component
  return (
    <ModalWrapper
      isOpen={!item.isClosing}
      isTopmost={active}
      zIndex={500 + index * 10}
      anchor={item.anchor}
      invoker={item.invoker}
      onClose={dismiss}
      onExited={finish}
    >
      <ModuleMetadataProvider value={item.metadata}>
        <Content data={item.data} onClose={dismiss} />
      </ModuleMetadataProvider>
    </ModalWrapper>
  )
}
/** Interactivity starts on mount; CSS owns entry motion, never a delayed open flag. */
export function ModalManager() {
  const { stack } = useModalStore()
  const active = stack.findLastIndex(item => !item.isClosing)
  return (
    <>
      {stack.map((item, index) => (
        <ManagedLayer
          key={item.id}
          item={item}
          index={index}
          active={index === active}
        />
      ))}
    </>
  )
}
