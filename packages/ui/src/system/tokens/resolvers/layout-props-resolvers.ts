// SPDX-License-Identifier: 0BSD
import type { TokenizedLayoutProps } from '../props/layout-props.css'
import { expandAliases, layoutAliases } from '../registry'

export const resolveLayoutSprinklesProps = (props: TokenizedLayoutProps) =>
  expandAliases(layoutAliases, props)
