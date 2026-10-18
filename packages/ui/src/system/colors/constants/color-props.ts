import type { ColorValue } from './colors'
import type { ThemeConditionProp } from './theme-conditions'

export type ColorPropName =
  | 'bg'
  | 'color'
  | 'borderColor'
  | 'ringColor'
  | 'ringOffsetColor'
  | 'divideColor'

export type ColorProps = Partial<
  Record<ColorPropName, ThemeConditionProp<ColorValue>>
>

export const COLOR_PROP_DEFS = {
  bg: {
    className: 'monolith-bg',
    cssProperty: 'backgroundColor',
    varPrefix: '--monolith-bg'
  },
  color: {
    className: 'monolith-color',
    cssProperty: 'color',
    varPrefix: '--monolith-color'
  },
  borderColor: {
    className: 'monolith-border-color',
    cssProperty: 'borderColor',
    varPrefix: '--monolith-border-color'
  },
  ringColor: {
    className: 'monolith-ring-color',
    cssProperty: '--monolith-ring-color-resolved',
    varPrefix: '--monolith-ring-color'
  },
  ringOffsetColor: {
    className: 'monolith-ring-offset-color',
    cssProperty: '--monolith-ring-offset-color-resolved',
    varPrefix: '--monolith-ring-offset-color'
  },
  divideColor: {
    className: 'monolith-divide-color',
    cssProperty: '--monolith-divide-color-resolved',
    varPrefix: '--monolith-divide-color'
  }
} as const satisfies Record<
  ColorPropName,
  {
    className: string
    cssProperty: string
    varPrefix: string
  }
>
