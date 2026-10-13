import type React from 'react'
import {
  createContext,
  useMemo,
  useContext as useReactContext,
  useState
} from 'react'

import { useModuleTranslation } from '@lifeforge/localization'

import { Tabs as TabsComponent } from '@/components/navigation'
import useNuqsOrBasicState from '@/hooks/useNuqsOrBasicState'

export interface TabState<TTab extends string = string> {
  amounts: Partial<Record<TTab, number>>
  currentTab: TTab
  setAmounts: (amounts: Partial<Record<TTab, number>>) => void
  setCurrentTab: (tab: TTab) => void
}

interface CreateTabbedViewConfig<
  TTabItems extends ReadonlyArray<{
    id: string
    name: string
    icon?: string
    color?: string
    amount?: number | ((currentTab: string) => number)
  }>
> {
  tabs: TTabItems
  defaultValue?: TTabItems[number]['id']
  namespace?: string | false
  useNuqs?: boolean
  enabled?: readonly TTabItems[number]['id'][]
  selectorProps?: Omit<
    React.ComponentProps<typeof TabsComponent>,
    'items' | 'currentTab' | 'onTabChange' | 'enabled'
  >
}

export interface TabbedViewRootProps<
  TTabItems extends ReadonlyArray<{
    id: string
    name: string
    icon?: string
    color?: string
    amount?: number | ((currentTab: string) => number)
  }>
> {
  children: React.ReactNode
  currentTab?: TTabItems[number]['id']
  onTabChange?: (tab: TTabItems[number]['id']) => void
}

export function createTabbedView<
  const TTabItems extends ReadonlyArray<{
    id: string
    name: string
    icon?: string
    color?: string
    amount?: number | ((currentTab: string) => number)
  }>
>({
  tabs,
  defaultValue,
  namespace,
  useNuqs: syncWithUrl = false,
  enabled,
  selectorProps: configSelectorProps
}: CreateTabbedViewConfig<TTabItems>) {
  const tabValues = tabs.map(t => t.id)

  const TabContext = createContext<TabState<TTabItems[number]['id']> | null>(
    null
  )

  function useContext(): TabState<TTabItems[number]['id']>
  function useContext<T>(
    selector: (state: TabState<TTabItems[number]['id']>) => T
  ): T
  function useContext<T>(
    selector?: (state: TabState<TTabItems[number]['id']>) => T
  ) {
    const state = useReactContext(TabContext)

    if (!state) throw new Error('TabbedView.Root is required')

    return selector ? selector(state) : state
  }

  function Root({
    children,
    currentTab: controlledTab,
    onTabChange: controlledOnTabChange
  }: TabbedViewRootProps<TTabItems>) {
    const effectiveDefault =
      defaultValue && (!enabled || enabled.includes(defaultValue))
        ? defaultValue
        : enabled?.[0] || tabValues[0]

    const [currentTab, setCurrentTab] = useNuqsOrBasicState<
      TTabItems[number]['id']
    >({
      options: tabValues,
      useNuqs: syncWithUrl ? 'tab' : false,
      defaultValue: effectiveDefault,
      controlled: {
        value: controlledTab ?? null,
        setValue: controlledOnTabChange ?? null
      }
    })

    const [amounts, setAmounts] = useState<
      Partial<Record<TTabItems[number]['id'], number>>
    >({})

    return (
      <TabContext value={{ currentTab, setCurrentTab, amounts, setAmounts }}>
        {children}
      </TabContext>
    )
  }

  function When({
    tabId,
    children
  }: {
    tabId: TTabItems[number]['id']
    children: React.ReactNode
  }) {
    const { currentTab } = useContext()

    if (tabId !== currentTab) {
      return null
    }

    return <>{children}</>
  }

  function Selector(
    props?: Omit<
      React.ComponentProps<typeof TabsComponent>,
      'items' | 'currentTab' | 'onTabChange' | 'enabled'
    >
  ) {
    const { currentTab, setCurrentTab, amounts } = useContext()

    const { t } = useModuleTranslation(
      namespace === false ? [] : namespace ? [namespace] : []
    )

    const items = useMemo(
      () =>
        tabs.map(tab => {
          const id = tab.id as TTabItems[number]['id']

          return id in amounts
            ? {
                ...tab,
                name: namespace === false ? tab.name : t(tab.name),
                amount: amounts[id]
              }
            : { ...tab, name: namespace === false ? tab.name : t(tab.name) }
        }),
      [amounts, t]
    )

    return (
      <TabsComponent
        currentTab={currentTab}
        enabled={enabled ?? tabValues}
        items={items as unknown as typeof tabs}
        onTabChange={setCurrentTab}
        {...configSelectorProps}
        {...props}
      />
    )
  }

  return { Root, When, Selector, useContext }
}
