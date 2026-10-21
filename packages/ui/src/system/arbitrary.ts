// SPDX-License-Identifier: 0BSD
import type { ResponsiveProp } from './responsive/types'

type ResponsiveFields<
  Name extends string,
  Value = string,
  Output = Value
> = Partial<Record<Name, ResponsiveProp<Value, Output>>>

export type ArbitrarySizeProps = ResponsiveFields<
  | 'width'
  | 'height'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight'
  | 'aspectRatio'
>
export type ArbitraryPositionProps = ResponsiveFields<
  'inset' | 'top' | 'right' | 'bottom' | 'left' | 'zIndex'
>
export type ArbitraryFlexChildProps = ResponsiveFields<
  'flex' | 'flexBasis' | 'flexGrow' | 'flexShrink'
>
export type ArbitraryGridChildProps = ResponsiveFields<'gridArea'> &
  ResponsiveFields<'gridColumnSpan' | 'gridRowSpan', number, string>
export type ArbitraryProps = ArbitrarySizeProps &
  ArbitraryPositionProps &
  ArbitraryFlexChildProps &
  ArbitraryGridChildProps
