import { memo } from 'react'
import tinycolor from 'tinycolor2'

import { Text, colorWithOpacity } from '@lifeforge/ui'

function ItemCount({
  tagColor,
  tagCount,
  isSelected
}: {
  tagColor: string
  tagCount: number
  isSelected: boolean
}) {
  return (
    <Text
      bg={
        isSelected && tagColor === ''
          ? colorWithOpacity('primary', '30%')
          : undefined
      }
      color={
        !isSelected
          ? 'muted'
          : tagColor === ''
            ? 'primary'
            : tinycolor(tagColor).isLight()
              ? 'bg-800'
              : 'bg-100'
      }
      size="xs"
      style={{ marginLeft: '5px' }}
    >
      {tagCount}
    </Text>
  )
}

export default memo(ItemCount, (prevProps, nextProps) => {
  return (
    prevProps.tagColor === nextProps.tagColor &&
    prevProps.tagCount === nextProps.tagCount &&
    prevProps.isSelected === nextProps.isSelected
  )
})
