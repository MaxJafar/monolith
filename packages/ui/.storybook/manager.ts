import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

addons.setConfig({
  panelPosition: 'bottom',
  theme: create({
    base: 'dark',
    brandUrl: 'https://github.com/MaxJafar/monolith',
    appBg: '#171717',
    appBorderColor: '#262626',
    appBorderRadius: 8,
    brandTitle: 'Monolith UI',
    brandTarget: '_self',
    textColor: '#f5f5f5',
    fontBase: '"Inter", sans-serif',
    fontCode: '"JetBrains Mono", monospace',
    buttonBg: '#eeeeec',
    colorPrimary: '#eeeeec',
    appContentBg: '#171717',
    barTextColor: '#f5f5f5',
    barBg: '#1f1f1f',
    inputBg: '#262626',
    inputBorder: '#333333',
    inputTextColor: '#f5f5f5',
    inputBorderRadius: 4,
    colorSecondary: '#eeeeec',
    textMutedColor: '#999999',
    textInverseColor: '#1f1f1f',
    barHoverColor: '#eeeeec',
    appHoverBg: '#1f1f1f',
    appPreviewBg: '#1f1f1f',
    barSelectedColor: '#eeeeec',
    booleanBg: '#262626',
    booleanSelectedBg: '#73736f',
    buttonBorder: 'none'
  })
})
