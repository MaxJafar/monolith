import type { CSSProperties } from 'react'

import type { ArbitraryProps } from './arbitrary'
import { type ColorPropName, type ColorProps, resolveColorProp } from './colors'
import type { ResponsiveProp } from './responsive/types'
import { getResponsiveLayoutStyles } from './responsive/utils/getResponsiveLayoutStyles'

type Sprinkles = { (props: any): string; properties: Set<string> }
type Outputs<T> = {
  [K in keyof T]: NonNullable<T[K]> extends ResponsiveProp<
    infer I,
    infer O,
    any
  >
    ? ResponsiveProp<I, O, 'output'>
    : T[K]
}
type Options<S extends Sprinkles, Extra extends object> = {
  sprinkles: S
  sprinkleProps: Partial<Parameters<S>[0]>
  arbitraryProps?: Partial<Outputs<ArbitraryProps>>
  componentArbitraryProps?: Partial<Outputs<Extra>>
  colorProps?: ColorProps
  style?: CSSProperties
  className?: string
}
export interface ResolvedStyle {
  className: string
  style: CSSProperties
}

export function mergeStyle(...sources: ResolvedStyle[]): ResolvedStyle {
  const result: ResolvedStyle = { className: '', style: {} }
  const names = new Set<string>()
  for (const source of sources) {
    for (const name of source.className.split(/\s+/)) if (name) names.add(name)
    Object.assign(result.style, source.style)
  }
  result.className = [...names].join(' ')
  return result
}

export function resolveStyles<S extends Sprinkles, Extra extends object = {}>(
  options: Options<S, Extra>
): ResolvedStyle {
  const colors = Object.entries(options.colorProps ?? {}).map(([name, value]) =>
    resolveColorProp(name as ColorPropName, value)
  )
  const layout = getResponsiveLayoutStyles({
    ...options.arbitraryProps,
    ...options.componentArbitraryProps
  })
  const tokens = Object.fromEntries(
    Object.entries(options.sprinkleProps).filter(
      ([name, value]) =>
        value !== undefined && options.sprinkles.properties.has(name)
    )
  )
  return mergeStyle(
    layout,
    ...colors,
    { className: options.sprinkles(tokens), style: {} },
    {
      className: options.className ?? '',
      style: options.style ?? {}
    }
  )
}
