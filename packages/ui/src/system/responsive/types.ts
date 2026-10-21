// SPDX-License-Identifier: 0BSD
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'print'

type AtBreakpoints<Value> = Partial<Record<Breakpoint, Value>>
export type ResponsiveProp<
  Input,
  Output = Input,
  Direction extends 'input' | 'output' = 'input'
> = Direction extends 'output'
  ? Output | AtBreakpoints<Output>
  : Input | AtBreakpoints<Input>

export type PropDef = {
  className: string
  customProperties: Array<`--${string}`>
}
