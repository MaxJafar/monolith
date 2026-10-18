import { type ReactNode, useState } from 'react'

import { Button } from '@/components/inputs/Button'
import { Stack } from '@/components/primitives'

import { FloatingPopover } from '../FloatingPopover'
import './popoverButton.css'

/** Small contextual editors share positioning, keyboard behavior and surface motion. */
export function PopoverButton({
  label,
  icon = 'lucide:settings-2',
  iconOnly = false,
  width = 280,
  children
}: {
  label: string
  icon?: string
  iconOnly?: boolean
  width?: number
  children: ReactNode
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <Button
        namespace={false}
        variant="plain"
        icon={icon}
        aria-label={label}
        className="monolith-popover-trigger"
        aria-expanded={!!anchor}
        aria-haspopup="dialog"
        onClick={event => setAnchor(anchor ? null : event.currentTarget)}
      >
        {iconOnly ? null : label}
      </Button>
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={label}
          width={width}
          onClose={() => setAnchor(null)}
        >
          <Stack gap="xs" className="monolith-popover-editor">
            {children}
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
