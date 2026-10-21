// SPDX-License-Identifier: 0BSD
import { type ReactNode, useEffect } from 'react'

import { PersonalizationProvider, usePersonalization } from '@/providers'
import { defaults } from '@/providers/PersonalizationProvider/preferences'
import { workspaceAPI } from '@/utils/workspaceAPI'

import { useSBTheme } from './useSBTheme'

type Globals = {
  theme?: unknown
  themeColor?: unknown
  fontScale?: unknown
  bgTemp?: unknown
}
function choices(globals: Globals) {
  const reset = (value: unknown, fallback: string) =>
    typeof value === 'string' && value !== '_reset' ? value : fallback
  const scale = Number(globals.fontScale)
  return {
    theme: globals.theme === 'dark' ? ('dark' as const) : ('light' as const),
    rawThemeColor: reset(globals.themeColor, defaults.rawThemeColor),
    bgTemp: reset(globals.bgTemp, defaults.bgTemp),
    fontScale: Number.isFinite(scale) && scale > 0 ? Math.min(3, scale) : 1
  }
}
function ApplyGlobals({ globals }: { globals: ReturnType<typeof choices> }) {
  const { setTheme, setRawThemeColor, setBgTemp, setFontScale } =
    usePersonalization()
  useEffect(() => {
    setTheme(globals.theme)
    setRawThemeColor(globals.rawThemeColor)
    setBgTemp(globals.bgTemp)
    setFontScale(globals.fontScale)
  }, [
    globals.theme,
    globals.rawThemeColor,
    globals.bgTemp,
    globals.fontScale,
    setTheme,
    setRawThemeColor,
    setBgTemp,
    setFontScale
  ])
  return null
}
export function SBThemeProvider({
  children,
  context
}: {
  children: ReactNode
  context: { globals?: Globals }
}) {
  const globals = choices(context.globals ?? {})
  useSBTheme({ globals })
  return (
    <PersonalizationProvider
      workspaceAPI={workspaceAPI}
      defaultValueOverride={{ ...globals, rootElement: document.body }}
    >
      <ApplyGlobals globals={globals} />
      {children}
    </PersonalizationProvider>
  )
}
