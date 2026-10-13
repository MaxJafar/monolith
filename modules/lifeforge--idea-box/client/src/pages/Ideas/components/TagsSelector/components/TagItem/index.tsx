import { memo, useCallback } from 'react'
import tinycolor from 'tinycolor2'

import { Box, Flex, Icon, Text, colorWithOpacity } from '@lifeforge/ui'

import HamburgerButton from './components/HamburgerButton'
import ItemCount from './components/ItemCount'

function TagItem({
  id,
  label,
  icon,
  color,
  amount,
  isSelected,
  onSelect,
  onUpdate
}: {
  id: string
  label: string
  icon: string
  color: string
  amount: number
  isSelected: boolean
  onSelect: (tagName: string) => void
  onUpdate: (id: string) => void
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(label)
      }
    },
    [label]
  )

  const handleClick = useCallback(() => {
    onSelect(label)
  }, [label])

  const handleUpdate = useCallback(() => {
    onUpdate(id)
  }, [id])

  return (
    <Text
      asChild
      color={
        !isSelected
          ? { base: 'muted', dark: 'bg-300' }
          : color === ''
            ? 'primary'
            : tinycolor(color).isLight()
              ? 'bg-800'
              : 'bg-100'
      }
    >
      <Flex
        align="center"
        bg={
          !isSelected
            ? { base: 'bg-200', dark: colorWithOpacity('bg-700', '50%') }
            : color === ''
              ? colorWithOpacity('primary', '30%')
              : undefined
        }
        gap="sm"
        px="sm"
        py="xs"
        r="full"
        role="button"
        style={{
          backgroundColor: isSelected ? color : undefined,
          cursor: 'pointer',
          transition: 'all 100ms'
        }}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {icon !== '' && (
          <Icon
            icon={icon}
            size="0.75rem"
            style={{ color: isSelected ? undefined : color }}
          />
        )}
        <Box asChild flexShrink="0">
          <Text size="sm">{label}</Text>
        </Box>
        <ItemCount isSelected={isSelected} tagColor={color} tagCount={amount} />
        <HamburgerButton
          isSelected={isSelected}
          tagColor={color}
          onUpdate={handleUpdate}
        />
      </Flex>
    </Text>
  )
}

export default memo(TagItem, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.amount === nextProps.amount
  )
})
