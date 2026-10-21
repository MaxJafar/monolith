// SPDX-License-Identifier: 0BSD
import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

const neutral = {
  canvas: '#171717',
  elevated: '#1f1f1f',
  control: '#262626',
  border: '#333333',
  text: '#f5f5f5',
  secondary: '#999999',
  accent: '#eeeeec'
}
addons.setConfig({
  panelPosition: 'bottom',
  theme: create({
    base: 'dark',
    brandTitle: 'Monolith UI',
    brandUrl: 'https://github.com/MaxJafar/monolith',
    brandTarget: '_self',
    fontBase: '"Inter", sans-serif',
    fontCode: '"JetBrains Mono", monospace',
    appBg: neutral.canvas,
    appContentBg: neutral.canvas,
    appPreviewBg: neutral.elevated,
    appHoverBg: neutral.elevated,
    appBorderColor: neutral.control,
    appBorderRadius: 8,
    colorPrimary: neutral.accent,
    colorSecondary: neutral.accent,
    textColor: neutral.text,
    textMutedColor: neutral.secondary,
    textInverseColor: neutral.canvas,
    barBg: neutral.elevated,
    barTextColor: neutral.text,
    barSelectedColor: neutral.accent,
    barHoverColor: neutral.accent,
    inputBg: neutral.control,
    inputTextColor: neutral.text,
    inputBorder: neutral.border,
    inputBorderRadius: 4,
    buttonBg: neutral.control,
    buttonBorder: neutral.border,
    booleanBg: neutral.control,
    booleanSelectedBg: neutral.secondary
  })
})
