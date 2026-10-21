// SPDX-License-Identifier: 0BSD
import type { CSSProperties } from 'react'

import type { ArbitraryProps } from './arbitrary'
import { type ColorPropName, type ColorProps, resolveColorProp } from './colors'
import './colors/color-props.css'
import './responsive/index.css'
import type { ResponsiveProp } from './responsive/types'
import { getResponsiveLayoutStyles } from './responsive/utils/getResponsiveLayoutStyles'

export interface ResolvedStyle {
  className: string
  style: CSSProperties
}
type SprinkleFunction = { (props: any): string; properties: Set<string> }
type OutputValues<Fields> = {
  [Key in keyof Fields]: NonNullable<Fields[Key]> extends ResponsiveProp<
    infer In,
    infer Out,
    any
  >
    ? ResponsiveProp<In, Out, 'output'>
    : Fields[Key]
}
interface StyleRequest<T extends SprinkleFunction, Extra extends object> {
  sprinkles: T
  sprinkleProps: Partial<Parameters<T>[0]>
  arbitraryProps?: Partial<OutputValues<ArbitraryProps>>
  componentArbitraryProps?: Partial<OutputValues<Extra>>
  colorProps?: ColorProps
  style?: CSSProperties
  className?: string
}

export function mergeStyle(...rules: ResolvedStyle[]): ResolvedStyle {
  return {
    className: [
      ...new Set(
        rules
          .flatMap(rule => rule.className.trim().split(/\s+/))
          .filter(Boolean)
      )
    ].join(' '),
    style: rules.reduce<CSSProperties>(
      (styles, rule) => ({ ...styles, ...rule.style }),
      {}
    )
  }
}
export function resolveStyles<
  T extends SprinkleFunction,
  Extra extends object = {}
>(input: StyleRequest<T, Extra>): ResolvedStyle {
  const tokens: Record<string, unknown> = {}
  for (const name of input.sprinkles.properties) {
    const value = input.sprinkleProps[name]
    if (value !== undefined) tokens[name] = value
  }
  const computed: ResolvedStyle[] = [
    getResponsiveLayoutStyles({
      ...input.arbitraryProps,
      ...input.componentArbitraryProps
    })
  ]
  for (const name of Object.keys(input.colorProps ?? {}) as ColorPropName[]) {
    computed.push(resolveColorProp(name, input.colorProps![name]))
  }
  computed.push({ className: input.sprinkles(tokens), style: {} })
  computed.push({ className: input.className ?? '', style: input.style ?? {} })
  return mergeStyle(...computed)
}
