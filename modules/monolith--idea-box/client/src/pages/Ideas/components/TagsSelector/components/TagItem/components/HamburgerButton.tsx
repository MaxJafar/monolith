import { memo, useCallback } from 'react'
import tinycolor from 'tinycolor2'

import { Flex, Icon, colorWithOpacity } from '@monolith/ui'

function HamburgerButton({
  tagColor,
  isSelected,
  onUpdate
}: {
  tagColor: string
  isSelected: boolean
  onUpdate: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const handleUpdate = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onUpdate(e)
    },
    [onUpdate]
  )

  return (
    <Flex
      align="center"
      as="button"
      bg={
        !isSelected
          ? { hover: 'bg-300', darkHover: 'bg-600' }
          : tagColor === ''
            ? { hover: colorWithOpacity('primary', '30%') }
            : tinycolor(tagColor).isLight()
              ? { hover: 'bg-800' }
              : { hover: 'bg-100' }
      }
      justify="center"
      r="full"
      style={{
        aspectRatio: '1',
        cursor: 'pointer',
        height: '100%',
        transition: 'all 100ms'
      }}
      onClick={handleUpdate}
    >
      <Icon
        color={
          !isSelected
            ? { base: 'muted', hover: 'bg-100' }
            : tagColor === ''
              ? 'primary'
              : tinycolor(tagColor).isLight()
                ? { base: 'bg-800', hover: 'bg-100' }
                : { base: 'bg-100', hover: 'bg-800' }
        }
        icon="tabler:dots-vertical"
        size="1em"
      />
    </Flex>
  )
}

export default memo(HamburgerButton, (prevProps, nextProps) => {
  return (
    prevProps.tagColor === nextProps.tagColor &&
    prevProps.isSelected === nextProps.isSelected
  )
})
