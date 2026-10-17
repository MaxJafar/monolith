import type React from 'react'
import {
  createContext,
  useEffect,
  useMemo,
  useContext as useReactContext
} from 'react'

import { useModuleMetadata } from '@monolith/federation'
import { useModuleTranslation } from '@monolith/localization'

import useNuqsOrBasicState from '@/hooks/useNuqsOrBasicState'

import { ViewModeContextMenuSelector as ViewModeContextMenuSelectorComponent } from './components/ViewModeContextMenuSelector'
import { ViewModeSelector as ViewModeSelectorComponent } from './components/ViewModeSelector'

export interface ViewModeState<TMode extends string = string> {
  currentMode: TMode
  setCurrentMode: (mode: TMode) => void
}

interface CreateViewModeConfig<
  TViewModes extends ReadonlyArray<{
    value: string
    icon?: string
    text?: string
  }>
> {
  modes: TViewModes
  defaultValue?: TViewModes[number]['value']
  namespace?: string | false
  useNuqs?: boolean
  persistInLocalStorage?: boolean | string
  selectorProps?: Omit<
    React.ComponentProps<typeof ViewModeSelectorComponent>,
    'modes' | 'currentMode' | 'onModeChange'
  >
  contextMenuSelectorProps?: Omit<
    React.ComponentProps<typeof ViewModeContextMenuSelectorComponent>,
    'modes' | 'currentMode' | 'onModeChange'
  >
}

export interface ViewModeRootProps<
  TViewModes extends ReadonlyArray<{
    value: string
    icon?: string
    text?: string
  }>
> {
  children: React.ReactNode
  currentMode?: TViewModes[number]['value']
  onModeChange?: (mode: TViewModes[number]['value']) => void
}

export function createViewMode<
  const TViewModes extends ReadonlyArray<{
    value: string
    icon?: string
    text?: string
  }>
>({
  modes,
  namespace,
  persistInLocalStorage = true,
  defaultValue,
  useNuqs: syncWithUrl = true,
  selectorProps: configSelectorProps,
  contextMenuSelectorProps: configContextMenuSelectorProps
}: CreateViewModeConfig<TViewModes>) {
  const modeValues = modes.map(m => m.value)

  const ModeContext = createContext<ViewModeState<
    TViewModes[number]['value']
  > | null>(null)

  function useContext(): ViewModeState<TViewModes[number]['value']>
  function useContext<T>(
    selector: (state: ViewModeState<TViewModes[number]['value']>) => T
  ): T
  function useContext<T>(
    selector?: (state: ViewModeState<TViewModes[number]['value']>) => T
  ) {
    const state = useReactContext(ModeContext)

    if (!state) throw new Error('ViewMode.Root is required')

    return selector ? selector(state) : state
  }

  function Root({
    children,
    currentMode: controlledMode,
    onModeChange: controlledOnModeChange
  }: ViewModeRootProps<TViewModes>) {
    const { name: moduleName } = useModuleMetadata()

    const storageKey = useMemo(() => {
      if (!persistInLocalStorage) return null

      const suffix =
        persistInLocalStorage === true ? 'view-mode' : persistInLocalStorage

      return `${moduleName}-${suffix}`
    }, [moduleName])

    let storedCandidate: string | null = null

    try {
      if (typeof window !== 'undefined' && storageKey)
        storedCandidate = localStorage.getItem(storageKey)
    } catch {
      // Some browsers disable storage. URL and in-memory selection remain usable.
    }

    const effectiveDefault =
      modeValues.find(value => value === storedCandidate) ?? defaultValue

    const [currentMode, setCurrentMode] = useNuqsOrBasicState({
      options: modeValues,
      defaultValue: effectiveDefault,
      useNuqs: syncWithUrl ? 'view' : false,
      controlled: {
        value: controlledMode ?? null,
        setValue: controlledOnModeChange ?? null
      }
    })

    useEffect(() => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, currentMode)
        } catch {
          // Storage is optional; selecting a view must still work.
        }
      }
    }, [storageKey, currentMode])

    return (
      <ModeContext value={{ currentMode, setCurrentMode }}>
        {children}
      </ModeContext>
    )
  }

  function When({
    mode,
    children
  }: {
    mode: TViewModes[number]['value']
    children: React.ReactNode
  }) {
    const { currentMode } = useContext()

    if (mode !== currentMode) {
      return null
    }

    return <>{children}</>
  }

  function Selector(
    props?: Omit<
      React.ComponentProps<typeof ViewModeSelectorComponent>,
      'modes' | 'currentMode' | 'onModeChange'
    >
  ) {
    const { currentMode, setCurrentMode } = useContext()

    const { t } = useModuleTranslation(
      namespace === false ? [] : namespace ? [namespace] : []
    )

    const items = useMemo(
      () =>
        modes.map(mode => ({
          ...mode,
          text: namespace === false || !mode.text ? mode.text : t(mode.text)
        })),
      [t]
    )

    return (
      <ViewModeSelectorComponent
        currentMode={currentMode}
        modes={items as unknown as typeof modes}
        onModeChange={setCurrentMode}
        {...configSelectorProps}
        {...props}
      />
    )
  }

  function ContextMenuSelector(
    props?: Omit<
      React.ComponentProps<typeof ViewModeContextMenuSelectorComponent>,
      'modes' | 'currentMode' | 'onModeChange' | 'namespace'
    >
  ) {
    const { currentMode, setCurrentMode } = useContext()

    return (
      <ViewModeContextMenuSelectorComponent
        currentMode={currentMode}
        modes={modes}
        namespace={namespace}
        onModeChange={setCurrentMode}
        {...configContextMenuSelectorProps}
        {...props}
      />
    )
  }

  return { Root, When, Selector, ContextMenuSelector, useContext }
}

export type { ViewModeContextMenuSelectorProps } from './components/ViewModeContextMenuSelector'

export type { ViewModeSelectorProps } from './components/ViewModeSelector'
