// SPDX-License-Identifier: 0BSD
import type { layoutSprinkles } from '../layout.css'

export {
  layoutBase as boxBase,
  layoutSprinkles as boxSprinkles
} from '../layout.css'

export type BoxSprinkles = Parameters<typeof layoutSprinkles>[0]
