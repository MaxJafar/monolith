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

type State = {
  moduleGroups: FederatedModuleGroup[]
  globalProviders: FC<{ children: ReactNode }>[]
  categoryTranslations: Record<string, Record<string, string>>
  loading: boolean
  error: Error | null
}
type ContextValue = State & {
  [K in keyof State as `set${Capitalize<K>}`]: Dispatch<
    SetStateAction<State[K]>
  >
} & { refetch: RefObject<() => Promise<void>> }

const fallback: ContextValue = {
  moduleGroups: [],
  globalProviders: [],
  categoryTranslations: {},
  loading: true,
  error: null,
  setModuleGroups() {},
  setGlobalProviders() {},
  setCategoryTranslations() {},
  setLoading() {},
  setError() {},
  refetch: { current: async () => {} }
}
const Context = createContext<ContextValue>(fallback)
export function useFederation(): ContextValue {
  return useContext(Context)
}

export default function FederationProvider({
  children
}: {
  children: ReactNode
}) {
  const [state, update] = useState<State>({
    moduleGroups: [],
    globalProviders: [],
    categoryTranslations: {},
    loading: true,
    error: null
  })
  const refetch = useRef<() => Promise<void>>(async () => {})
  const actions = useMemo(() => {
    function field<K extends keyof State>(
      name: K
    ): Dispatch<SetStateAction<State[K]>> {
      return value =>
        update(current => {
          const next =
            typeof value === 'function'
              ? (value as (old: State[K]) => State[K])(current[name])
              : value
          return Object.is(next, current[name])
            ? current
            : { ...current, [name]: next }
        })
    }
    return {
      setModuleGroups: field('moduleGroups'),
      setGlobalProviders: field('globalProviders'),
      setCategoryTranslations: field('categoryTranslations'),
      setLoading: field('loading'),
      setError: field('error')
    }
  }, [])
  const value = useMemo(
    () => ({ ...state, ...actions, refetch }),
    [state, actions]
  )
  return <Context value={value}>{children}</Context>
}
