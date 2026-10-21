// SPDX-License-Identifier: 0BSD
import { Box, type BoxProps } from '../Box'
import './prose.css'

export function Prose({ className, ...content }: BoxProps) {
  return (
    <Box
      {...content}
      className={['monolith-prose', className].filter(Boolean).join(' ')}
    />
  )
}
