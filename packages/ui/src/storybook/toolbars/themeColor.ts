// SPDX-License-Identifier: 0BSD
import { formatHex } from 'culori'

import { TAILWIND_PALETTE } from '@/system/colors/constants/tailwind-palette'

import { toolbar } from './options'

export const THEME_COLOR_TOOLBAR_CONFIG = toolbar(
  'Accent',
  'Check semantic colors against an accent',
  'paintbrush',
  [
    { value: '#252525', title: 'Monolith' },
    ...Object.entries(TAILWIND_PALETTE).map(([name, steps]) => ({
      value: formatHex(steps[500]) ?? '#252525',
      title: name[0].toUpperCase() + name.slice(1)
    }))
  ]
)
