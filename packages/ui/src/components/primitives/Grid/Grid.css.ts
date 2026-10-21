// SPDX-License-Identifier: 0BSD
import type { layoutSprinkles } from '../layout.css'

export {
  layoutBase as gridBase,
  layoutSprinkles as gridSprinkles
} from '../layout.css'

export type GridSprinkles = Parameters<typeof layoutSprinkles>[0]
