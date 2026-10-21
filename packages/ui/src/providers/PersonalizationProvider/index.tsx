// SPDX-License-Identifier: 0BSD
import {
  type ReactNode,
  type SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react'

import { useLanguageEffect } from '@monolith/localization'

import type { workspaceAPI as coreWorkspaceAPI } from '@/utils/workspaceAPI'

import { applyTheme } from './applyTheme'
import type {
  IPersonalizationData,
  PreferenceSetters,
  Preferences
} from './interfaces/personalization_provider_interfaces'
import { defaults, derivePreferences, initialPreferences } from './preferences'
import { useFonts } from './useFonts'

function observeSystemTheme(notify: () => void) {
  const media =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!media) return () => {}
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
function systemTheme() {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
}
function setters(
  update: (change: (previous: Preferences) => Preferences) => void
): PreferenceSetters {
  return Object.fromEntries(
    Object.keys(defaults).map(name => {
      const key = name as keyof Preferences
      return [
        'set' + name[0].toUpperCase() + name.slice(1),
        (action: SetStateAction<Preferences[typeof key]>) =>
          update(previous => {
            const next =
              typeof action === 'function'
                ? action(previous[key] as never)
                : action
            return Object.is(previous[key], next)
              ? previous
              : { ...previous, [key]: next }
          })
      ]
    })
  ) as PreferenceSetters
}
const fallback: IPersonalizationData = {
  ...defaults,
  ...derivePreferences(defaults, false),
  ...setters(() => {}),
  rootElement: null
}
const Personalization = createContext(fallback)

export function PersonalizationProvider({
  children,
  workspaceAPI,
  defaultValueOverride = {}
}: {
  children: ReactNode
  workspaceAPI: typeof coreWorkspaceAPI
  defaultValueOverride?: Partial<IPersonalizationData>
}) {
  const [settings, update] = useState(() =>
    initialPreferences(defaultValueOverride)
  )
  const actions = useMemo(() => setters(update), [])
  const systemDark = useSyncExternalStore(
    observeSystemTheme,
    systemTheme,
    () => false
  )
  const rootElement =
    defaultValueOverride.rootElement ??
    (typeof document === 'undefined' ? null : document.body)
  const derived = useMemo(
    () => derivePreferences(settings, systemDark),
    [settings, systemDark]
  )
  const value = useMemo(
    () => ({ ...settings, ...actions, ...derived, rootElement }),
    [settings, actions, derived, rootElement]
  )
  useLanguageEffect(settings.language)
  useFonts(rootElement, settings.fontFamily, workspaceAPI)
  useEffect(() => {
    if (!rootElement) return
    return applyTheme(rootElement, settings, systemDark)
  }, [
    rootElement,
    settings.theme,
    settings.rawThemeColor,
    settings.bgTemp,
    settings.bordered,
    settings.fontScale,
    settings.borderRadiusMultiplier,
    systemDark
  ])
  useEffect(() => {
    if (
      rootElement !== document.body &&
      rootElement !== document.documentElement
    )
      return
    try {
      localStorage.setItem('monolith.theme', settings.theme)
    } catch {
      /* Optional device preference. */
    }
  }, [rootElement, settings.theme])
  return (
    <Personalization value={value}>
      <meta
        name="theme-color"
        content={derived.derivedTheme === 'dark' ? '#191919' : '#ffffff'}
      />
      {children}
    </Personalization>
  )
}
export function usePersonalization() {
  return useContext(Personalization)
}
export { BG_BLURS } from './constants/bg_blurs'
export type {
  IDashboardLayout,
  IBackdropFilters
} from './interfaces/personalization_provider_interfaces'
