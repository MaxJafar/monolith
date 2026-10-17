import { RESPONSIVE_CONDITIONS } from '../constant'
import type { ResponsiveProp } from '../types'

export function normalizeResponsiveProp<Input, Output = Input>(
  value: ResponsiveProp<Input, any> | undefined,
  mapper?: (value: Input) => Output
): ResponsiveProp<Input, Output, 'output'> | undefined {
  if (value == null) return
  const convert = mapper ?? ((item: Input) => item as unknown as Output)
  if (typeof value !== 'object') return convert(value as Input)
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, item]) =>
          Object.hasOwn(RESPONSIVE_CONDITIONS, key) && item !== undefined
      )
      .map(([key, item]) => [key, convert(item as Input)])
  )
}
