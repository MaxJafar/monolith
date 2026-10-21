// SPDX-License-Identifier: 0BSD
import { toolbar } from './options'

export const FONT_SCALE_TOOLBAR_CONFIG = toolbar(
  'Text size',
  'Check layout at different text scales',
  'grow',
  [1, 0.8, 1.25, 1.5, 2, 3].map(value => ({
    value,
    title: Math.round(value * 100) + '%'
  }))
)
