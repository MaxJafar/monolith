// SPDX-License-Identifier: 0BSD
import type { layoutSprinkles } from '../layout.css'

export {
  layoutBase as flexBase,
  layoutSprinkles as flexSprinkles
} from '../layout.css'

export type FlexSprinkles = Parameters<typeof layoutSprinkles>[0]
