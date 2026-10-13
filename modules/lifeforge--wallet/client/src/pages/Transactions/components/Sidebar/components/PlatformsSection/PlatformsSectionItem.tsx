import { useCallback } from 'react'

import { SidebarItem } from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'

export default function PlatformsSectionItem({
  icon,
  label,
  color,
  id,
  amount
}: {
  icon: string
  label: string
  color: string
  id: string | null
  amount: number | undefined
}) {
  const { platform, updateFilter } = useFilter()

  const active = platform === id || (platform === '' && id === null)

  const handleCancelButtonClick = useCallback(() => {
    updateFilter('platform', '')
  }, [updateFilter])

  const handleClick = useCallback(() => {
    updateFilter('platform', id ?? '')
  }, [id, updateFilter])

  return (
    <SidebarItem
      active={active}
      icon={icon}
      label={label}
      namespace={id ? false : undefined}
      number={amount}
      sideStripColor={color}
      onCancelButtonClick={id !== null ? handleCancelButtonClick : undefined}
      onClick={handleClick}
    />
  )
}
