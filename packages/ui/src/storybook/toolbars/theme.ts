// SPDX-License-Identifier: 0BSD
import { toolbar } from './options'

export const THEME_TOOLBAR_CONFIG = toolbar(
  'Appearance',
  'Preview the same component in light or dark mode',
  'contrast',
  [
    { value: 'light', title: 'Light' },
    { value: 'dark', title: 'Dark' }
  ]
)
