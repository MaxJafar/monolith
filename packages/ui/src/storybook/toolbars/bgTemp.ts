// SPDX-License-Identifier: 0BSD
import { toolbar } from './options'

export const BG_TEMP_TOOLBAR_CONFIG = toolbar(
  'Surface',
  'Change the neutral palette',
  'paintbrush',
  ['zillion', 'slate', 'gray', 'zinc', 'neutral', 'stone'].map(name => ({
    value: 'bg-' + name,
    title:
      name === 'zillion' ? 'Monolith' : name[0].toUpperCase() + name.slice(1)
  }))
)
