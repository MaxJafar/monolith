// SPDX-License-Identifier: 0BSD
import type { TokenizedLayoutProps } from '../props/layout-props.css'
import type { TokenizedRoundedProps } from '../props/rounded-props.css'
import type { TokenizedSpacingProps } from '../props/spacing-props.css'
import {
  expandAliases,
  layoutAliases,
  roundingAliases,
  spacingAliases
} from '../registry'

export type TokenizedCommonProps = TokenizedLayoutProps &
  TokenizedSpacingProps &
  TokenizedRoundedProps
const aliases = { ...spacingAliases, ...layoutAliases, ...roundingAliases }

export function resolveCommonSprinkleProps(
  spacing: TokenizedSpacingProps,
  layout: TokenizedLayoutProps,
  rounded: TokenizedRoundedProps
) {
  return expandAliases(aliases, { ...spacing, ...layout, ...rounded })
}
