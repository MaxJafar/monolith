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

import './scrollbar.css'

export type ScrollValues = {
  left: number
  top: number
  scrollLeft: number
  scrollTop: number
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
}
export interface ScrollbarHandle {
  getValues(): ScrollValues
  getScrollLeft(): number
  getScrollTop(): number
  getScrollWidth(): number
  getScrollHeight(): number
  getClientWidth(): number
  getClientHeight(): number
  scrollLeft(value?: number): void
  scrollTop(value?: number): void
  scrollToLeft(): void
  scrollToRight(): void
  scrollToTop(): void
  scrollToBottom(): void
}
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

function measure(view: HTMLElement | null): ScrollValues {
  const scrollLeft = view?.scrollLeft ?? 0,
    scrollTop = view?.scrollTop ?? 0
  const scrollWidth = view?.scrollWidth ?? 0,
    scrollHeight = view?.scrollHeight ?? 0
  const clientWidth = view?.clientWidth ?? 0,
    clientHeight = view?.clientHeight ?? 0
  return {
    scrollLeft,
    scrollTop,
    scrollWidth,
    scrollHeight,
    clientWidth,
    clientHeight,
    left:
      scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0,
    top:
      scrollHeight > clientHeight
        ? scrollTop / (scrollHeight - clientHeight)
        : 0
  }
}
const length = (value: number | string | undefined) =>
  typeof value === 'number' ? value + 'px' : value

/** Native scrolling retains touch momentum, keyboard access and browser accessibility. */
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
  onScroll,
  onWheel,
  onScrollFrame,
  onScrollStart,
  onScrollStop,
  onUpdate,
  ...attributes
}: ScrollbarProps) {
  const element = useRef<HTMLDivElement>(null)
  const stop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useImperativeHandle(
    ref,
    () => ({
      getValues: () => measure(element.current),
      getScrollLeft: () => element.current?.scrollLeft ?? 0,
      getScrollTop: () => element.current?.scrollTop ?? 0,
      getScrollWidth: () => element.current?.scrollWidth ?? 0,
      getScrollHeight: () => element.current?.scrollHeight ?? 0,
      getClientWidth: () => element.current?.clientWidth ?? 0,
      getClientHeight: () => element.current?.clientHeight ?? 0,
      scrollLeft: (left = 0) => {
        if (element.current) element.current.scrollLeft = left
      },
      scrollTop: (top = 0) => {
        if (element.current) element.current.scrollTop = top
      },
      scrollToLeft: () => {
        if (element.current) element.current.scrollLeft = 0
      },
      scrollToTop: () => {
        if (element.current) element.current.scrollTop = 0
      },
      scrollToRight: () => {
        if (element.current)
          element.current.scrollLeft = element.current.scrollWidth
      },
      scrollToBottom: () => {
        if (element.current)
          element.current.scrollTop = element.current.scrollHeight
      }
    }),
    []
  )
  useEffect(() => {
    const view = element.current
    if (!view || !onUpdate) return
    const notify = () => onUpdate(measure(view))
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(notify)
    observer?.observe(view)
    notify()
    return () => observer?.disconnect()
  }, [onUpdate, children])
  useEffect(() => () => clearTimeout(stop.current), [])

  return (
    <Flex
      {...attributes}
      ref={element}
      className={[
        'monolith-scroll',
        autoHide && 'monolith-scroll-auto',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      direction="column"
      width="100%"
      height={autoHeight ? 'auto' : '100%'}
      minWidth="0"
      minHeight={autoHeight ? length(autoHeightMin) : '0'}
      maxHeight={autoHeight ? length(autoHeightMax) : undefined}
      overflowY="auto"
      overflowX={hideHorizontal ? 'hidden' : 'auto'}
      pr={usePaddingRight ? 'sm' : undefined}
      tabIndex={attributes.tabIndex ?? 0}
      onWheel={event => {
        onWheel?.(event)
        if (!event.defaultPrevented)
          elasticScrollEdge(event.currentTarget, event.nativeEvent)
      }}
      onScroll={event => {
        onScroll?.(event)
        onScrollFrame?.(measure(event.currentTarget))
        if (stop.current === undefined) onScrollStart?.()
        clearTimeout(stop.current)
        stop.current = setTimeout(() => {
          stop.current = undefined
          onScrollStop?.()
        }, 120)
      }}
    >
      {children}
    </Flex>
  )
}
