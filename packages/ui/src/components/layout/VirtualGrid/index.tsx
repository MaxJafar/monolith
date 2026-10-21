// SPDX-License-Identifier: 0BSD
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Box, Grid } from '@/components/primitives'
import useDivSize from '@/hooks/useDivSize'

import { rowOffsets, visibleRows } from './rows'

interface VirtualGridProps<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  getItemKey: (item: T) => string | number
  itemMinWidth?: number
  defaultRowHeight?: number
}

function MeasuredRow({
  top,
  columns,
  children,
  report
}: {
  top: number
  columns: number
  children: ReactNode
  report: (height: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef(report)
  latest.current = report
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () =>
      latest.current(Math.ceil(element.getBoundingClientRect().height))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <Box ref={ref} position="absolute" top={top + 'px'} left="0" width="100%">
      <Grid
        templateCols={`repeat(${columns}, minmax(0, 1fr))`}
        gap="md"
        pb="md"
      >
        {children}
      </Grid>
    </Box>
  )
}

export function VirtualGrid<T>({
  items,
  renderItem,
  getItemKey,
  itemMinWidth = 240,
  defaultRowHeight = 320
}: VirtualGridProps<T>) {
  const container = useRef<HTMLDivElement>(null)
  const { width, height } = useDivSize(container)
  const [scroll, setScroll] = useState(0)
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(new Map())
  const itemOrder = JSON.stringify(items.map(getItemKey))
  useLayoutEffect(() => {
    if (container.current) container.current.scrollTop = 0
    setScroll(0)
  }, [itemOrder])
  const columns = Math.max(
    1,
    Math.floor(
      width / (Number.isFinite(itemMinWidth) ? Math.max(1, itemMinWidth) : 240)
    )
  )
  const estimate = Number.isFinite(defaultRowHeight)
    ? Math.max(1, defaultRowHeight)
    : 320
  const rows = useMemo(() => {
    const result: { key: string; items: T[] }[] = []
    for (let index = 0; index < items.length; index += columns) {
      const members = items.slice(index, index + columns)
      result.push({
        key: JSON.stringify([Math.round(width), ...members.map(getItemKey)]),
        items: members
      })
    }
    return result
  }, [items, columns, width, getItemKey])
  const offsets = rowOffsets(rows.length, estimate, row =>
    heights.get(rows[row].key)
  )
  const range = visibleRows(offsets, scroll, height || estimate)
  useEffect(() => {
    const keys = new Set(rows.map(row => row.key))
    setHeights(current => {
      if ([...current.keys()].every(key => keys.has(key))) return current
      return new Map([...current].filter(([key]) => keys.has(key)))
    })
  }, [rows])
  return (
    <Box
      ref={container}
      className="virtual-grid"
      width="100%"
      height="100%"
      minHeight="0"
      overflowY="auto"
      position="relative"
      onScroll={event => setScroll(event.currentTarget.scrollTop)}
    >
      <Box position="relative" width="100%" height={offsets.at(-1) + 'px'}>
        {rows.slice(range.from, range.to).map((row, index) => (
          <MeasuredRow
            key={row.key}
            columns={columns}
            top={offsets[range.from + index]}
            report={next => {
              if (next <= 0) return
              setHeights(current =>
                current.get(row.key) === next
                  ? current
                  : new Map(current).set(row.key, next)
              )
            }}
          >
            {row.items.map(item => (
              <Box key={getItemKey(item)} minWidth="0" width="100%">
                {renderItem(item)}
              </Box>
            ))}
          </MeasuredRow>
        ))}
      </Box>
    </Box>
  )
}
