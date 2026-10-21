// SPDX-License-Identifier: 0BSD
import { Icon as Iconify } from '@iconify/react'

import { styledIcon } from '@monolith/blocks'

import { useAppearance } from '@/providers/AppearanceProvider/context'
import { type ResponsiveProp, normalizeResponsiveProp } from '@/system'
import { getResponsiveStyles } from '@/system/responsive/utils/getResponsiveLayoutStyles'

import { Text, type TextProps } from '../Text'
import './icon.css'

export { addCollection as registerIconCollection } from '@iconify/react'
export type IconProps = Omit<TextProps, 'size'> & {
  icon: string
  size?: ResponsiveProp<string | number>
  preserveStyle?: boolean
}
export function Icon({
  icon,
  size = '1.25em',
  preserveStyle,
  className,
  style,
  color,
  ...text
}: IconProps) {
  const { appearance } = useAppearance()
  const dimensions = getResponsiveStyles(
    { className: 'monolith-size', customProperties: ['--monolith-size'] },
    normalizeResponsiveProp(size, value =>
      typeof value === 'number' ? value + 'px' : value
    )
  )
  const overrides =
    color === undefined || color === 'primary' ? appearance.icons : undefined
  return (
    <Text
      {...text}
      asChild
      color={color}
      className={[dimensions?.className, className].filter(Boolean).join(' ')}
      style={{
        flexShrink: 0,
        ...dimensions?.style,
        ...(overrides ? { color: overrides } : {}),
        ...style
      }}
    >
      <Iconify
        icon={preserveStyle ? icon : styledIcon(icon, appearance.iconSet)}
      />
    </Text>
  )
}
