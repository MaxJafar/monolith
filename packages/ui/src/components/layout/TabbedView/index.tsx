// SPDX-License-Identifier: 0BSD
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  useContext as readContext,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { Tabs } from '@/components/navigation/Tabs'

import { ChoiceRoot } from '../ChoiceRoot'

type Tab = {
  id: string
  name: string
  icon?: string
  color?: string
  amount?: number | ((currentTab: string) => number)
}
type SelectorProps = Omit<
  ComponentProps<typeof Tabs>,
  'items' | 'currentTab' | 'onTabChange' | 'enabled'
>
export interface TabState<T extends string = string> {
  currentTab: T
  setCurrentTab: (tab: T) => void
  amounts: Partial<Record<T, number>>
  setAmounts: (amounts: Partial<Record<T, number>>) => void
}
export interface TabbedViewRootProps<T extends readonly Tab[]> {
  children: ReactNode
  currentTab?: T[number]['id']
  onTabChange?: (tab: T[number]['id']) => void
}
type Configuration<T extends readonly Tab[]> = {
  tabs: T
  defaultValue?: T[number]['id']
  namespace?: string | false
  useNuqs?: boolean
  enabled?: readonly T[number]['id'][]
  selectorProps?: SelectorProps
}
export function createTabbedView<const T extends readonly Tab[]>(
  config: Configuration<T>
) {
  type Id = T[number]['id']
  const all = config.tabs.map(tab => tab.id) as Id[]
  const enabled = config.enabled ?? all
  const selectable = all.filter(id => enabled.includes(id))
  const Context = createContext<TabState<Id> | null>(null)
  function useContext(): TabState<Id>
  function useContext<R>(select: (state: TabState<Id>) => R): R
  function useContext<R>(select?: (state: TabState<Id>) => R) {
    const state = readContext(Context)
    if (!state)
      throw new Error('TabbedView.Root must wrap its controls and panels.')
    return select ? select(state) : state
  }
  function Root({ children, currentTab, onTabChange }: TabbedViewRootProps<T>) {
    const [amounts, setAmounts] = useState<Partial<Record<Id, number>>>({})
    return (
      <ChoiceRoot
        choices={selectable.length ? selectable : all}
        initial={config.defaultValue}
        value={currentTab}
        onChange={onTabChange}
        queryKey={config.useNuqs ? 'tab' : undefined}
      >
        {state => (
          <Context
            value={{
              currentTab: state.value,
              setCurrentTab: state.change,
              amounts,
              setAmounts
            }}
          >
            {children}
          </Context>
        )}
      </ChoiceRoot>
    )
  }
  function When({ tabId, children }: { tabId: Id; children: ReactNode }) {
    return useContext(state => state.currentTab) === tabId ? children : null
  }
  function Selector(props: SelectorProps = {}) {
    const state = useContext()
    const { t } = useModuleTranslation(
      config.namespace ? [config.namespace] : []
    )
    const items = config.tabs.map(tab => ({
      ...tab,
      name: config.namespace === false ? tab.name : t(tab.name),
      amount: state.amounts[tab.id as Id] ?? tab.amount
    }))
    return (
      <Tabs
        {...config.selectorProps}
        {...props}
        items={items}
        enabled={enabled}
        currentTab={state.currentTab}
        onTabChange={state.setCurrentTab}
      />
    )
  }
  return { Root, When, Selector, useContext }
}
