// SPDX-License-Identifier: 0BSD
import { kebabCase } from 'lodash'
import type { ComponentProps } from 'react'

import { Icon, type IconProps } from '@/components/primitives'

import { Tooltip } from '../Tooltip'

export function IconTooltip({
  id,
  icon,
  iconProps,
  children,
  ...options
}: ComponentProps<typeof Tooltip> & {
  icon: string
  iconProps?: Omit<IconProps, 'icon'>
}) {
  const anchor = 'tooltip-' + kebabCase(id)
  return (
    <>
      <span tabIndex={0} data-tooltip-id={anchor}>
        <Icon icon={icon} color="muted" {...iconProps} />
      </span>
      <Tooltip place="top-start" {...options} id={anchor}>
        {children}
      </Tooltip>
    </>
  )
}
