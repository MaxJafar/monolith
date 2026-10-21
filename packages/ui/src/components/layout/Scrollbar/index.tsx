// SPDX-License-Identifier: 0BSD
import {
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react'

import { Flex } from '@/components/primitives'
import { elasticScrollEdge } from '@/utils/elasticMotion'

import {
  type ScrollValues,
  type ScrollbarHandle,
  readScroll,
  scrollHandle
} from './scrollPosition'
import './scrollbar.css'

export type { ScrollbarHandle, ScrollValues } from './scrollPosition'
export interface ScrollbarProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<ScrollbarHandle>
  children: ReactNode
  usePaddingRight?: boolean
  hideHorizontal?: boolean
  autoHeight?: boolean
  autoHeightMin?: number | string
  autoHeightMax?: number | string
  autoHide?: boolean
  onScrollFrame?: (values: ScrollValues) => void
  onScrollStart?: () => void
  onScrollStop?: () => void
  onUpdate?: (values: ScrollValues) => void
}

const pixels = (length: string | number) =>
  typeof length === 'number' ? length + 'px' : length

export function Scrollbar({
  ref,
  children,
  className,
  usePaddingRight = true,
  hideHorizontal = false,
  autoHeight = false,
  autoHeightMin = 0,
  autoHeightMax = 200,
  autoHide = true,
  onScrollFrame,
  onScrollStart,
  onScrollStop,
  onUpdate,
  onScroll,
  onWheel,
  ...dom
}: ScrollbarProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopCallback = useRef(onScrollStop)
  useEffect(() => {
    stopCallback.current = onScrollStop
  }, [onScrollStop])
  useImperativeHandle(ref, () => scrollHandle(() => viewport.current), [])

  useEffect(() => {
    const view = viewport.current
    if (!view || !onUpdate) return
    let frame: number | undefined
    const report = () => {
      frame = undefined
      onUpdate(readScroll(view))
    }
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(report)
    }
    // A fixed viewport can remain unchanged while images or children grow.
    const resize =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(schedule)
        : undefined
    const watchChildren = () => {
      resize?.disconnect()
      resize?.observe(view)
      for (const child of view.children) resize?.observe(child)
      schedule()
    }
    const mutations = new MutationObserver(watchChildren)
    mutations.observe(view, {
      childList: true,
      subtree: true,
      characterData: true
    })
    watchChildren()
    return () => {
      mutations.disconnect()
      resize?.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [onUpdate])

  useEffect(
    () => () => {
      if (idleTimer.current !== null) clearTimeout(idleTimer.current)
      idleTimer.current = null
    },
    []
  )

  return (
    <Flex
      {...dom}
      ref={viewport}
      direction="column"
      width="100%"
      height={autoHeight ? 'auto' : '100%'}
      minWidth="0"
      minHeight={autoHeight ? pixels(autoHeightMin) : '0'}
      maxHeight={autoHeight ? pixels(autoHeightMax) : undefined}
      pr={usePaddingRight ? 'sm' : undefined}
      overflowX={hideHorizontal ? 'hidden' : 'auto'}
      overflowY="auto"
      tabIndex={dom.tabIndex ?? 0}
      className={[
        'monolith-scroll',
        autoHide ? 'monolith-scroll-auto' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      onWheel={event => {
        onWheel?.(event)
        if (!event.defaultPrevented)
          elasticScrollEdge(event.currentTarget, event.nativeEvent)
      }}
      onScroll={event => {
        onScroll?.(event)
        if (idleTimer.current === null) onScrollStart?.()
        else clearTimeout(idleTimer.current)
        onScrollFrame?.(readScroll(event.currentTarget))
        idleTimer.current = setTimeout(() => {
          idleTimer.current = null
          stopCallback.current?.()
        }, 120)
      }}
    >
      {children}
    </Flex>
  )
}
