// SPDX-License-Identifier: 0BSD
import type { TokenizedSpacingProps } from '../props/spacing-props.css'
import { expandAliases, spacingAliases } from '../registry'

export const resolveSpacingSprinklesProps = (props: TokenizedSpacingProps) =>
  expandAliases(spacingAliases, props)
