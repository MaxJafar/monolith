// SPDX-License-Identifier: 0BSD
import type { Dispatch, SetStateAction } from 'react'

export type DashboardTile = {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}
export type IDashboardLayout = Record<string, DashboardTile[]>
export type IBackdropFilters = {
  blur: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  brightness: number
  contrast: number
  saturation: number
  overlayOpacity: number
}
export type Preferences = {
  theme: 'light' | 'dark' | 'system'
  rawThemeColor: string
  bgTemp: string
  fontFamily: string
  fontScale: number
  borderRadiusMultiplier: number
  bordered: boolean
  bgImage: string
  backdropFilters: IBackdropFilters
  dashboardLayout: IDashboardLayout
  language: string
}
export type PreferenceSetters = {
  [K in keyof Preferences as `set${Capitalize<K>}`]: Dispatch<
    SetStateAction<Preferences[K]>
  >
}
export type IPersonalizationData = Preferences &
  PreferenceSetters & {
    rootElement: HTMLElement | null
    derivedTheme: 'light' | 'dark'
    derivedThemeColor: string
    bgTempPalette: Record<number, string>
    getMostReadableColor: (background?: string) => string
  }
