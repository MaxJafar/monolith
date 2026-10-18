import { Icon as IconifyIcon } from '@iconify/react'
import clsx from 'clsx'

import { styledIcon } from '@monolith/blocks'

import { useAppearance } from '@/providers/AppearanceProvider/context'
import type { ResponsiveProp } from '@/system'
import { getResponsiveStyles } from '@/system/responsive/utils/getResponsiveLayoutStyles'

import { Box } from '../Box'
import { Text, type TextProps } from '../Text'

export { addCollection as registerIconCollection } from '@iconify/react'

export type IconProps = Omit<TextProps, 'size'> & {
  icon: string
  size?: ResponsiveProp<string | number>
  preserveStyle?: boolean
}

export function Icon({
  icon,
  size = '1.25em',
  color,
  preserveStyle = false,
  ...rest
}: IconProps) {
  const { appearance } = useAppearance()
  const resolvedSize = getResponsiveStyles(
    {
      className: 'monolith-size',
      customProperties: ['--monolith-size']
    },
    size
  )

  return (
    <Box asChild flexShrink="0">
      <Text
        as="span"
        color={color}
        {...rest}
        asChild
        className={clsx(resolvedSize?.className, rest.className)}
        style={{
          ...resolvedSize?.style,
          ...((color === undefined || color === 'primary') && appearance.icons
            ? { color: appearance.icons }
            : {}),
          ...rest.style
        }}
      >
        <IconifyIcon
          icon={preserveStyle ? icon : styledIcon(icon, appearance.iconSet)}
        />
      </Text>
    </Box>
  )
}
