// SPDX-License-Identifier: 0BSD
import { atBreakpoints } from '../conditions'
import type { ResponsiveProp } from '../types'

export function normalizeResponsiveProp<Input, Output = Input>(
  value: ResponsiveProp<Input, any> | undefined,
  mapper?: (item: Input) => Output
): ResponsiveProp<Input, Output, 'output'> | undefined {
  if (value == null) return undefined
  const map = mapper ?? ((item: Input) => item as unknown as Output)
  const mapped = atBreakpoints<Input>(value).map(
    ([key, item]) => [key, map(item)] as const
  )
  return typeof value === 'object' ? Object.fromEntries(mapped) : mapped[0]?.[1]
}
