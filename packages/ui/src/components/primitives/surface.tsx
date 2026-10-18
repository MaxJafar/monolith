import type {
  CSSProperties,
  ComponentPropsWithRef,
  ElementType,
  ReactNode,
  Ref
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

import { boxBase, boxSprinkles } from './Box/Box.css'
import { flexBase, flexSprinkles } from './Flex/Flex.css'
import { gridBase, gridSprinkles } from './Grid/Grid.css'
import { Slot } from './Slot'

export interface SurfaceOwnProps<T extends ElementType, Display extends string>
  extends TokenizedCommonProps, ArbitraryProps {
  as?: T
  asChild?: boolean
  ref?: Ref<HTMLElement>
  display?: ResponsiveProp<Display>
  bg?: ThemeConditionProp<ColorValue>
  shadow?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export type SurfaceProps<T extends ElementType, Own> = Own &
  Omit<ComponentPropsWithRef<T>, keyof Own>

const spacing = 'p px py pt pr pb pl m mx my mt mr mb ml'.split(' ')
const layout = ['position', 'overflow', 'overflowX', 'overflowY']
const rounding = ['r', 'rtl', 'rtr', 'rbl', 'rbr']
const dimensions =
  'width minWidth maxWidth height minHeight maxHeight aspectRatio zIndex inset top right bottom left flex flexBasis flexGrow flexShrink gridArea gridColumnSpan gridRowSpan'.split(
    ' '
  )
const special = new Set([
  ...spacing,
  ...layout,
  ...rounding,
  ...dimensions,
  'as',
  'asChild',
  'ref',
  'children',
  'className',
  'style',
  'shadow',
  'bg',
  'display',
  'centered',
  'direction',
  'align',
  'justify',
  'wrap',
  'gap',
  'gapX',
  'gapY',
  'flow',
  'templateCols',
  'templateRows',
  'sus'
])
const variants = {
  box: { base: boxBase, sprinkles: boxSprinkles },
  flex: { base: flexBase, sprinkles: flexSprinkles },
  grid: { base: gridBase, sprinkles: gridSprinkles }
}
const alignment: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end'
}
const distribution: Record<string, string> = {
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly'
}

function select(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    keys.filter(key => source[key] !== undefined).map(key => [key, source[key]])
  )
}

/** One prop partition and style pass for every layout surface. Native props stay native. */
export function renderSurface(properties: object, kind: keyof typeof variants) {
  const props = properties as Record<string, unknown>
  const variant = variants[kind]
  const tokenProps: Record<string, unknown> = resolveCommonSprinkleProps(
    select(props, spacing),
    select(props, layout),
    select(props, rounding)
  )
  const normalize = (value: unknown, transform?: (value: string) => string) =>
    normalizeResponsiveProp(value as never, transform)
  tokenProps.display = normalize(
    props.display ?? (kind === 'box' ? undefined : kind)
  )
  const arbitrary: Record<string, unknown> = select(props, dimensions)
  for (const name of ['gridColumnSpan', 'gridRowSpan'])
    arbitrary[name] = normalizeResponsiveProp(
      props[name] as never,
      normalizeGridSpan
    )
  const extra: Record<
    string,
    ResponsiveProp<string | number, string, 'output'> | undefined
  > = {}
  if (kind !== 'box') {
    for (const [input, output] of [
      ['gap', 'gap'],
      ['gapX', 'columnGap'],
      ['gapY', 'rowGap']
    ])
      tokenProps[output!] = normalize(props[input!])
    const centered = kind === 'flex' && props.centered
    tokenProps.alignItems = normalize(
      centered ? 'center' : props.align,
      value => (kind === 'flex' ? (alignment[value] ?? value) : value)
    )
    tokenProps.justifyContent = normalize(
      centered ? 'center' : props.justify,
      value =>
        distribution[value] ??
        (kind === 'flex' ? (alignment[value] ?? value) : value)
    )
  }
  if (kind === 'flex') {
    tokenProps.flexDirection = normalize(props.direction)
    tokenProps.flexWrap = normalize(props.wrap)
  }
  if (kind === 'grid') {
    tokenProps.gridAutoFlow = normalize(props.flow)
    extra.gridTemplateColumns = normalizeResponsiveProp(
      props.templateCols as never,
      normalizeGridTrack
    )
    extra.gridTemplateRows = normalizeResponsiveProp(
      props.templateRows as never,
      normalizeGridTrack
    )
  }
  const resolved = resolveStyles({
    sprinkles: variant.sprinkles,
    sprinkleProps: tokenProps as never,
    arbitraryProps: arbitrary,
    componentArbitraryProps: extra,
    colorProps: { bg: props.bg as ThemeConditionProp<ColorValue> },
    className: [variant.base(), props.shadow && shadowClass, props.className]
      .filter(Boolean)
      .join(' '),
    style: props.style as CSSProperties | undefined
  })
  const native = Object.fromEntries(
    Object.entries(props).filter(([name]) => !special.has(name))
  )
  const Element = props.asChild ? Slot : (props.as as ElementType) || 'div'
  return (
    <Element {...native} {...resolved} ref={props.ref as Ref<HTMLElement>}>
      {props.children as ReactNode}
    </Element>
  )
}
