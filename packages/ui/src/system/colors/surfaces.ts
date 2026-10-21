// SPDX-License-Identifier: 0BSD
import type { TokenizedColor } from './constants/colors'

function tones<Base extends TokenizedColor>(base: Base) {
  return { base, dark: base }
}
function interactive<Base extends TokenizedColor, Hover extends TokenizedColor>(
  base: Base,
  hover: Hover
) {
  return { ...tones(base), hover, darkHover: hover }
}
export const surface = {
  default: tones('surface'),
  defaultInteractive: interactive('surface', 'surface-container'),
  light: tones('surface-container'),
  lightInteractive: interactive('surface-container', 'surface-container-high')
}
