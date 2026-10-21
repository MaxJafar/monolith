// SPDX-License-Identifier: 0BSD
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  useContext as readContext
} from 'react'

import { useModuleMetadata } from '@monolith/federation'
import { useModuleTranslation } from '@monolith/localization'

import { ChoiceRoot } from '../ChoiceRoot'
import { ViewModeContextMenuSelector as Menu } from './components/ViewModeContextMenuSelector'
import { ViewModeSelector as Buttons } from './components/ViewModeSelector'

type Mode = { value: string; text?: string; icon?: string }
type ButtonProps = Omit<
  ComponentProps<typeof Buttons>,
  'modes' | 'currentMode' | 'onModeChange'
>
type MenuProps = Omit<
  ComponentProps<typeof Menu>,
  'modes' | 'currentMode' | 'onModeChange' | 'namespace'
>
export interface ViewModeState<T extends string = string> {
  currentMode: T
  setCurrentMode: (value: T) => void
}
export interface ViewModeRootProps<T extends readonly Mode[]> {
  children: ReactNode
  currentMode?: T[number]['value']
  onModeChange?: (value: T[number]['value']) => void
}
type Configuration<T extends readonly Mode[]> = {
  modes: T
  defaultValue?: T[number]['value']
  namespace?: string | false
  useNuqs?: boolean
  persistInLocalStorage?: boolean | string
  selectorProps?: ButtonProps
  contextMenuSelectorProps?: MenuProps & { namespace?: string | false }
}
export function createViewMode<const T extends readonly Mode[]>(
  config: Configuration<T>
) {
  type Value = T[number]['value']
  const choices = config.modes.map(mode => mode.value) as Value[]
  const Context = createContext<ViewModeState<Value> | null>(null)
  function useContext(): ViewModeState<Value>
  function useContext<R>(select: (state: ViewModeState<Value>) => R): R
  function useContext<R>(select?: (state: ViewModeState<Value>) => R) {
    const state = readContext(Context)
    if (!state)
      throw new Error('ViewMode.Root must wrap its controls and panels.')
    return select ? select(state) : state
  }
  function Root({ children, currentMode, onModeChange }: ViewModeRootProps<T>) {
    const { name } = useModuleMetadata()
    const persistence = config.persistInLocalStorage ?? true
    const storageKey = persistence
      ? (name ?? '') +
        '-' +
        (typeof persistence === 'string' ? persistence : 'view-mode')
      : undefined
    return (
      <ChoiceRoot
        choices={choices}
        initial={config.defaultValue}
        value={currentMode}
        onChange={onModeChange}
        queryKey={config.useNuqs === false ? undefined : 'view'}
        storageKey={storageKey}
      >
        {state => (
          <Context
            value={{ currentMode: state.value, setCurrentMode: state.change }}
          >
            {children}
          </Context>
        )}
      </ChoiceRoot>
    )
  }
  function When({ mode, children }: { mode: Value; children: ReactNode }) {
    return useContext(state => state.currentMode) === mode ? children : null
  }
  function Selector(props: ButtonProps = {}) {
    const state = useContext()
    const { t } = useModuleTranslation(
      config.namespace ? [config.namespace] : []
    )
    const modes = config.modes.map(mode => ({
      ...mode,
      text: config.namespace === false || !mode.text ? mode.text : t(mode.text)
    }))
    return (
      <Buttons
        {...config.selectorProps}
        {...props}
        modes={modes}
        currentMode={state.currentMode}
        onModeChange={state.setCurrentMode}
      />
    )
  }
  function ContextMenuSelector(props: MenuProps = {}) {
    const state = useContext()
    return (
      <Menu
        {...config.contextMenuSelectorProps}
        {...props}
        namespace={
          config.contextMenuSelectorProps?.namespace ?? config.namespace
        }
        modes={config.modes}
        currentMode={state.currentMode}
        onModeChange={state.setCurrentMode}
      />
    )
  }
  return { Root, When, Selector, ContextMenuSelector, useContext }
}
export type { ViewModeSelectorProps } from './components/ViewModeSelector'
export type { ViewModeContextMenuSelectorProps } from './components/ViewModeContextMenuSelector'
