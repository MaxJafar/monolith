// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { Flex, type FlexProps } from '@/components/primitives'
import { usePersonalization } from '@/providers'

import { TagChip } from '../TagChip'

type Selection = string | string[] | null
export function TagsFilter<Values extends Record<string, Selection>>({
  availableFilters,
  values,
  onChange,
  ...layout
}: Omit<FlexProps<'div'>, 'onChange'> & {
  values: Values
  onChange: { [Key in keyof Values]: (value: Values[Key]) => void }
  availableFilters: Record<
    string,
    {
      data: { id: string; label: ReactNode; icon?: string; color?: string }[]
      isColored?: boolean
    }
  >
}) {
  const { derivedThemeColor } = usePersonalization()
  const selected = Object.keys(availableFilters).flatMap(key => {
    const current = values[key]
    const ids = Array.isArray(current) ? current : current ? [current] : []
    const group = availableFilters[key]
    return group.data
      .filter(item => ids.includes(item.id))
      .map(item => ({ key, item, group, current }))
  })
  if (!selected.length) return null
  return (
    <Flex align="center" gap="sm" wrap="wrap" {...layout}>
      {selected.map(({ key, item, group, current }) => (
        <TagChip
          key={key + ':' + item.id}
          label={item.label}
          icon={item.icon ?? ''}
          color={
            group.isColored ? (item.color ?? derivedThemeColor) : undefined
          }
          actionButtonProps={{
            icon: 'tabler:x',
            onClick: () => {
              const remaining = Array.isArray(current)
                ? current.filter(id => id !== item.id)
                : []
              onChange[key](
                (remaining.length ? remaining : null) as Values[typeof key]
              )
            }
          }}
        />
      ))}
    </Flex>
  )
}
