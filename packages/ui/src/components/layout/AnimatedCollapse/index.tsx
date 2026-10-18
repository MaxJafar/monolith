import type { ReactNode } from 'react'

import { Box, Grid } from '@/components/primitives'

import './collapse.css'

/** Keep content and focus state intact while its height and opacity settle. */
export function AnimatedCollapse({
  open,
  children,
  id,
  className = ''
}: {
  open: boolean
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <Grid
      id={id}
      className={`monolith-collapse ${className}`}
      templateRows={open ? '1fr' : '0fr'}
      data-open={open}
      aria-hidden={!open}
      inert={!open}
    >
      <Box
        minHeight="0"
        minWidth="0"
        overflow="hidden"
        className="monolith-collapse-content"
      >
        {children}
      </Box>
    </Grid>
  )
}
