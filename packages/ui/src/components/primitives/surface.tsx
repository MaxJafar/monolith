// SPDX-License-Identifier: 0BSD
import {
  type CSSProperties,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactNode,
  type Ref,
  createElement
} from 'react'

import {
  type ArbitraryProps,
  type ColorValue,
  type ResponsiveProp,
  type ThemeConditionProp,
  type TokenizedCommonProps,
  normalizeGridSpan,
  normalizeGridTrack,
  normalizeResponsiveProp,
  resolveCommonSprinkleProps,
  resolveStyles,
  shadowClass
} from '@/system'
import { LAYOUT_PROPERTIES } from '@/system/responsive/constant'
import {
  layoutValues,
  roundingAliases,
  spacingAliases
} from '@/system/tokens/registry'

import { Slot } from './Slot'
import { layoutBase, layoutSprinkles } from './layout.css'

export interface SurfaceOwnProps<T extends ElementType, Display extends string>
  extends TokenizedCommonProps, ArbitraryProps {
  as?: T
  asChild?: boolean
  ref?: Ref<HTMLElement>
  children?: ReactNode
  className?: string
  style?: CSSProperties
  display?: ResponsiveProp<Display>
  bg?: ThemeConditionProp<ColorValue>
  shadow?: boolean
}
export type SurfaceProps<T extends ElementType, Own> = Own &
  Omit<ComponentPropsWithRef<T>, keyof Own>
const common = { ...spacingAliases, ...roundingAliases, ...layoutValues }
const controls = new Set([
  'as',
  'asChild',
  'ref',
  'children',
  'className',
  'style',
  'display',
  'bg',
  'shadow',
  'sus',
  ...Object.keys(common),
  ...Object.keys(LAYOUT_PROPERTIES),
  'centered',
  'direction',
  'align',
  'justify',
  'wrap',
  'flow',
  'gap',
  'gapX',
  'gapY',
  'templateCols',
  'templateRows'
])
const flexNames = { direction: 'flexDirection', wrap: 'flexWrap' }
const gridNames = { flow: 'gridAutoFlow' }
const containerNames = {
  align: 'alignItems',
  justify: 'justifyContent',
  gap: 'gap',
  gapX: 'columnGap',
  gapY: 'rowGap'
}
const distribution: Record<string, string> = {
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly'
}

function pick(input: Record<string, unknown>, group: object) {
  return Object.fromEntries(
    Object.keys(group)
      .filter(key => input[key] !== undefined)
      .map(key => [key, input[key]])
  )
}
export function renderSurface(
  properties: object,
  kind: 'box' | 'flex' | 'grid'
) {
  const input = properties as Record<string, unknown>
  const tokens: Record<string, unknown> = resolveCommonSprinkleProps(
    pick(input, spacingAliases),
    pick(input, layoutValues),
    pick(input, roundingAliases)
  )
  tokens.display = normalizeResponsiveProp(
    input.display ?? (kind === 'box' ? undefined : kind)
  )
  const native = Object.fromEntries(
    Object.entries(input).filter(([key]) => !controls.has(key))
  )
  const dimensions = pick(input, LAYOUT_PROPERTIES)
  const map = (value: unknown, transform?: (item: any) => any) =>
    normalizeResponsiveProp(value, transform)
  for (const field of ['gridColumnSpan', 'gridRowSpan'])
    dimensions[field] = map(input[field], normalizeGridSpan)
  if (kind !== 'box') {
    const mappings = {
      ...containerNames,
      ...(kind === 'flex' ? flexNames : gridNames)
    }
    for (const [field, css] of Object.entries(mappings)) {
      const raw =
        kind === 'flex' &&
        input.centered &&
        (field === 'align' || field === 'justify')
          ? 'center'
          : input[field]
      tokens[css] = map(raw, value => {
        if (field === 'justify' && distribution[value])
          return distribution[value]
        if (
          kind === 'flex' &&
          (field === 'align' || field === 'justify') &&
          (value === 'start' || value === 'end')
        )
          return 'flex-' + value
        return value
      })
    }
  }
  if (kind === 'grid') {
    dimensions.gridTemplateColumns = map(input.templateCols, normalizeGridTrack)
    dimensions.gridTemplateRows = map(input.templateRows, normalizeGridTrack)
  }
  const computed = resolveStyles({
    sprinkles: layoutSprinkles,
    sprinkleProps: tokens,
    arbitraryProps: dimensions,
    colorProps: { bg: input.bg as ThemeConditionProp<ColorValue> },
    className: [layoutBase(), input.shadow && shadowClass, input.className]
      .filter(Boolean)
      .join(' '),
    style: input.style as CSSProperties | undefined
  })
  return createElement(
    input.asChild ? Slot : ((input.as as ElementType) ?? 'div'),
    { ...native, ...computed, ref: input.ref },
    input.children as ReactNode
  )
}
