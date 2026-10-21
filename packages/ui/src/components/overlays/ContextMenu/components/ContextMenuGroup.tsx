// SPDX-License-Identifier: 0BSD
import { Group, Label } from '@radix-ui/react-dropdown-menu'
import { type ReactNode, useId } from 'react'

import { Icon } from '@/components/primitives'

export function ContextMenuGroup({
  icon,
  label,
  children,
  className
}: {
  icon: string
  label: string
  children: ReactNode
  className?: string
}) {
  const heading = useId()
  return (
    <Group
      aria-labelledby={heading}
      className={['monolith-menu-group', className].filter(Boolean).join(' ')}
    >
      <Label id={heading} className="monolith-menu-heading">
        <Icon icon={icon} aria-hidden="true" />
        <span>{label}</span>
      </Label>
      {children}
    </Group>
  )
}
