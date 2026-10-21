// SPDX-License-Identifier: 0BSD
import type { TokenizedRoundedProps } from '../props/rounded-props.css'
import { expandAliases, roundingAliases } from '../registry'

export const resolveRoundedSprinklesProps = (props: TokenizedRoundedProps) =>
  expandAliases(roundingAliases, props)
