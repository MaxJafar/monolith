// SPDX-License-Identifier: 0BSD
import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState
} from 'react'

interface SidebarState {
  isSidebarOpen: boolean
  setIsSidebarOpen: (value: boolean) => void
}
const Sidebar = createContext<SidebarState>({
  isSidebarOpen: false,
  setIsSidebarOpen: () => {}
})
export function ModuleSidebarStateProvider({
  children
}: {
  children: ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const state = useMemo(
    () => ({ isSidebarOpen, setIsSidebarOpen }),
    [isSidebarOpen]
  )
  return <Sidebar value={state}>{children}</Sidebar>
}
export function useModuleSidebarState() {
  return useContext(Sidebar)
}
