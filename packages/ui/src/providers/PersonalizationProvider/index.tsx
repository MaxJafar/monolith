import _ from 'lodash'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import tinycolor from 'tinycolor2'

import { useLanguageEffect } from '@lifeforge/localization'

import { forgeAPI as coreForgeAPI } from '@/utils/forgeAPI'

import { BG_THEME } from './constants/bg_theme'
import THEME_COLOR_HEX from './constants/theme_color_hex'
import useBgTempEffect from './hooks/useBgTempEffect'
import useBorderRadiusEffect from './hooks/useBorderRadiusEffect'
import useBorderedEffect from './hooks/useBorderedEffect'
import useFontFamily from './hooks/useFontFamilyEffect'
import useMetaEffect from './hooks/useMetaEffect'
import useRawThemeColorEffect from './hooks/useRawThemeColorEffect'
import useThemeEffect from './hooks/useThemeEffect'
import type {
  IBackdropFilters,
  IDashboardLayout,
  IPersonalizationData
} from './interfaces/personalization_provider_interfaces'
import { getColorPalette } from './utils/themeColors'

const DEFAULT_VALUE: IPersonalizationData = {
  rootElement: typeof document !== 'undefined' ? document.body : null,
  fontFamily: 'Inter',
  fontScale: 1,
  borderRadiusMultiplier: 1,
  bordered: false,
  theme: 'light',
  derivedTheme: 'light',
  rawThemeColor: '#252525',
  derivedThemeColor: '#252525',
  getMostReadableColor: () => '#000000',
  bgTemp: 'bg-zillion',
  bgTempPalette: BG_THEME['zillion'],
  bgImage: '',
  backdropFilters: {
    blur: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    overlayOpacity: 50
  },
  dashboardLayout: {},
  language: 'en',
  setDashboardLayout: () => {},
  setRawThemeColor: () => {},
  setFontFamily: () => {},
  setFontScale: () => {},
  setBorderRadiusMultiplier: () => {},
  setBordered: () => {},
  setTheme: () => {},
  setBgTemp: () => {},
  setBgImage: () => {},
  setBackdropFilters: () => {},
  setLanguage: () => {}
}

const PersonalizationContext = createContext<IPersonalizationData | undefined>(
  DEFAULT_VALUE
)

export function PersonalizationProvider({
  forgeAPI,
  defaultValueOverride = {},
  children
}: {
  forgeAPI: typeof coreForgeAPI
  defaultValueOverride?: Partial<IPersonalizationData>
  children: React.ReactNode
}) {
  const defaultValue = useMemo(() => {
    return {
      ...DEFAULT_VALUE,
      ...defaultValueOverride
    }
  }, [defaultValueOverride])

  const rootElement = defaultValue.rootElement || document.body

  const [fontFamily, setFontFamily] = useState<string>(defaultValue.fontFamily)
  const [fontScale, setFontScale] = useState<number>(defaultValue.fontScale)

  const [borderRadiusMultiplier, setBorderRadiusMultiplier] = useState<number>(
    defaultValue.borderRadiusMultiplier
  )

  const [bordered, setBordered] = useState<boolean>(defaultValue.bordered)

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const saved = localStorage.getItem('monolith.theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system')
        return saved
    } catch {
      /* Storage is optional. */
    }
    return defaultValue.theme
  })

  const [rawThemeColor, setRawThemeColor] = useState(defaultValue.rawThemeColor)

  const [bgTemp, setBgTemp] = useState<
    | 'bg-slate'
    | 'bg-gray'
    | 'bg-neutral'
    | 'bg-zinc'
    | 'bg-stone'
    | 'bg-mauve'
    | 'bg-olive'
    | 'bg-mist'
    | 'bg-taupe'
    | string
  >(defaultValue.bgTemp)

  const [bgImage, setBgImage] = useState(defaultValue.bgImage)
  const [language, setLanguage] = useState(defaultValue.language)

  const [dashboardLayout, setDashboardLayout] = useState<IDashboardLayout>(
    defaultValue.dashboardLayout
  )
  const [backdropFilters, setBackdropFilters] = useState<IBackdropFilters>(
    defaultValue.backdropFilters
  )
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    update()
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('monolith.theme', theme)
    } catch {
      /* Optional storage. */
    }
  }, [theme])

  const derivedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemDark ? 'dark' : 'light'
    }

    return theme
  }, [theme, systemDark])
  const themeColor = useMemo(
    () =>
      !rawThemeColor.startsWith('#')
        ? THEME_COLOR_HEX[
            _.camelCase(
              rawThemeColor.replace('theme-', '').replace(/-/g, ' ')
            ) as keyof typeof THEME_COLOR_HEX
          ]
        : rawThemeColor,
    [rawThemeColor]
  )
  const bgTempPalette = useMemo(() => {
    return !bgTemp.startsWith('#')
      ? BG_THEME[bgTemp.replace('bg-', '') as keyof typeof BG_THEME]
      : getColorPalette(bgTemp, 'bg')
  }, [bgTemp, derivedTheme])
  const getMostReadableColor = useMemo(
    () =>
      (bg?: string): string =>
        tinycolor
          .mostReadable(bg ?? themeColor, [
            bgTempPalette[100],
            bgTempPalette[800]
          ])
          .toHexString(),
    [themeColor, bgTempPalette]
  )

  useFontFamily(fontFamily, fontScale, forgeAPI)
  useThemeEffect(rootElement, derivedTheme, rawThemeColor, bgTemp)
  useBgTempEffect(rootElement, bgTemp, derivedTheme)

  useRawThemeColorEffect(rootElement, rawThemeColor, derivedTheme, [
    bgTempPalette[100],
    bgTempPalette[800]
  ])

  useLanguageEffect(language)
  useMetaEffect()
  useBorderRadiusEffect(borderRadiusMultiplier)
  useBorderedEffect(rootElement, bordered)

  const value = useMemo<IPersonalizationData>(
    () => ({
      rootElement,
      fontFamily,
      fontScale,
      borderRadiusMultiplier,
      bordered,
      theme,
      derivedTheme,
      rawThemeColor,
      derivedThemeColor: themeColor,
      getMostReadableColor,
      bgTemp,
      bgTempPalette,
      bgImage,
      backdropFilters,
      language,
      dashboardLayout,
      setDashboardLayout,
      setRawThemeColor,
      setFontFamily,
      setFontScale,
      setBorderRadiusMultiplier,
      setBordered,
      setTheme,
      setBgTemp,
      setBgImage,
      setBackdropFilters,
      setLanguage
    }),
    [
      rootElement,
      fontFamily,
      fontScale,
      borderRadiusMultiplier,
      bordered,
      theme,
      rawThemeColor,
      derivedTheme,
      themeColor,
      getMostReadableColor,
      bgTemp,
      bgTempPalette,
      bgImage,
      backdropFilters,
      language,
      dashboardLayout
    ]
  )

  return (
    <PersonalizationContext value={value}>
      <meta
        content={derivedTheme === 'dark' ? '#191919' : '#ffffff'}
        name="theme-color"
      />
      {children}
    </PersonalizationContext>
  )
}

export function usePersonalization(): IPersonalizationData {
  const context = useContext(PersonalizationContext)

  return context || DEFAULT_VALUE
}

export { BG_BLURS } from './constants/bg_blurs'

export type {
  IDashboardLayout,
  IBackdropFilters
} from './interfaces/personalization_provider_interfaces'
