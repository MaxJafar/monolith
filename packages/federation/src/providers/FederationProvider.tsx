// SPDX-License-Identifier: 0BSD
import {
  type Dispatch,
  type FC,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'

import type { ModuleGroup } from '@monolith/configs'

import type { FederatedModule } from '../utils/fetchModuleData'

export interface FederatedModuleGroup {
  title: string
  items: (ModuleGroup['items'][number] & { rawModule?: FederatedModule })[]
}
export const SYSTEM_CATEGORIES = [
  '<START>',
  'Miscellaneous',
  'Settings',
  'SSO',
  '<END>'
]
type Provider = FC<{ children: ReactNode }>
interface State {
  moduleGroups: FederatedModuleGroup[]
  globalProviders: Provider[]
  categoryTranslations: Record<string, Record<string, string>>
  error: Error | null
  loading: boolean
}
type ContextValue = State & {
  [K in keyof State as `set${Capitalize<K>}`]: Dispatch<
    SetStateAction<State[K]>
  >
} & { refetch: RefObject<() => Promise<void>> }
const ignore = () => {}
const FederationContext = createContext<ContextValue>({
  moduleGroups: [],
  globalProviders: [],
  categoryTranslations: {},
  error: null,
  loading: true,
  setModuleGroups: ignore,
  setGlobalProviders: ignore,
  setCategoryTranslations: ignore,
  setError: ignore,
  setLoading: ignore,
  refetch: { current: async () => {} }
})
export const useFederation = () => useContext(FederationContext)

export default function FederationProvider({
  children
}: {
  children: ReactNode
}) {
  const [moduleGroups, setModuleGroups] = useState<FederatedModuleGroup[]>([])
  const [globalProviders, setGlobalProviders] = useState<Provider[]>([])
  const [categoryTranslations, setCategoryTranslations] = useState<
    State['categoryTranslations']
  >({})
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const refetch = useRef(async () => {})
  const value = useMemo(
    () => ({
      moduleGroups,
      globalProviders,
      categoryTranslations,
      error,
      loading,
      setModuleGroups,
      setGlobalProviders,
      setCategoryTranslations,
      setError,
      setLoading,
      refetch
    }),
    [moduleGroups, globalProviders, categoryTranslations, error, loading]
  )
  return <FederationContext value={value}>{children}</FederationContext>
}
