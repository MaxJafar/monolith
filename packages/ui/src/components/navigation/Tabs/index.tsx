// SPDX-License-Identifier: 0BSD
import { useRef } from 'react'

import { Flex, type FlexProps, Icon, Text } from '@/components/primitives'

import { tab } from './tabs.css'

type TabItem = {
  readonly id: string
  readonly name: string
  readonly icon?: string
  readonly color?: string
  readonly amount?: number | ((currentTab: string) => number)
}
export interface TabsProps<
  T,
  TKey = T extends ReadonlyArray<{ readonly id: infer Id }> ? Id : never
> extends FlexProps {
  items: T
  enabled: readonly TKey[]
  currentTab: TKey
  onTabChange: (id: TKey) => void
}
export function Tabs<
  T extends readonly TabItem[],
  TKey = T extends ReadonlyArray<{ readonly id: infer Id }> ? Id : never
>({ items, enabled, currentTab, onTabChange, ...layout }: TabsProps<T, TKey>) {
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const visible = items.filter(item => enabled.includes(item.id as TKey))
  const focusId = visible.some(item => item.id === currentTab)
    ? currentTab
    : visible[0]?.id
  return (
    <Flex {...layout} role="tablist" align="center" gap="xs" overflowX="auto">
      {visible.map((item, index) => {
        const selected = item.id === currentTab
        const amount =
          typeof item.amount === 'function'
            ? item.amount(String(currentTab))
            : item.amount
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={tab}
            aria-selected={selected}
            tabIndex={item.id === focusId ? 0 : -1}
            ref={element => {
              if (element) buttons.current.set(item.id, element)
              else buttons.current.delete(item.id)
            }}
            style={
              selected && item.color
                ? { color: item.color, borderBottomColor: item.color }
                : undefined
            }
            onClick={() => onTabChange(item.id as TKey)}
            onKeyDown={event => {
              let next = index
              const rtl =
                getComputedStyle(event.currentTarget).direction === 'rtl'
              if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = visible.length - 1
              else if (event.key === 'ArrowRight')
                next =
                  (index + (rtl ? -1 : 1) + visible.length) % visible.length
              else if (event.key === 'ArrowLeft')
                next =
                  (index + (rtl ? 1 : -1) + visible.length) % visible.length
              else return
              event.preventDefault()
              const item = visible[next]
              buttons.current.get(item.id)?.focus()
              onTabChange(item.id as TKey)
            }}
          >
            <Flex as="span" gap="sm" align="center" minWidth="0">
              {item.icon && <Icon icon={item.icon} aria-hidden="true" />}
              <Text whiteSpace="nowrap">{item.name}</Text>
              {amount !== undefined && (
                <Text color="muted" size="sm">
                  {amount}
                </Text>
              )}
            </Flex>
          </button>
        )
      })}
    </Flex>
  )
}
