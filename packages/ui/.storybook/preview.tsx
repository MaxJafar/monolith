// SPDX-License-Identifier: 0BSD
import type { Preview } from '@storybook/react-vite'

import { PreviewWrapper } from '@/storybook/PreviewWrapper'
import { BG_TEMP_TOOLBAR_CONFIG } from '@/storybook/toolbars/bgTemp'
import { FONT_SCALE_TOOLBAR_CONFIG } from '@/storybook/toolbars/fontScale'
import { THEME_TOOLBAR_CONFIG } from '@/storybook/toolbars/theme'
import { THEME_COLOR_TOOLBAR_CONFIG } from '@/storybook/toolbars/themeColor'

import './index.css'

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [PreviewWrapper],
  globalTypes: {
    theme: THEME_TOOLBAR_CONFIG,
    themeColor: THEME_COLOR_TOOLBAR_CONFIG,
    bgTemp: BG_TEMP_TOOLBAR_CONFIG,
    fontScale: FONT_SCALE_TOOLBAR_CONFIG
  },
  initialGlobals: {
    theme: 'light',
    themeColor: '#252525',
    bgTemp: 'bg-zillion',
    fontScale: 1
  },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true, sort: 'requiredFirst' },
    docs: { codePanel: true },
    options: {
      storySort: {
        order: [
          'Primitives',
          'Layout',
          'Inputs',
          'Form',
          'Overlays',
          'Feedback',
          'Navigation',
          'API',
          'Auth'
        ]
      }
    }
  }
}
export default preview
