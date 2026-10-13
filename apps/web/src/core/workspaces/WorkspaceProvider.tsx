import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '@lifeforge/api'

import { workspaceAPI } from './workspaceAPI'
import { WorkspaceContext as Context } from './WorkspaceContext'

export { useWorkspace } from './WorkspaceContext'

function rememberWorkspace(owner:string,id:string) {
  try {localStorage.setItem(`monolith.workspace.${owner}`,id)}catch{/* Workspace state remains available without browser storage. */}
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    cache = useQueryClient()
  const options = workspaceAPI.workspaces.list.queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!userData?.id
  })
  
const [selected, setSelected] = useState('')
  
const routeWorkspace = new URLSearchParams(location.search).get('workspace')
  const active =
    query.data?.find(item => item.id === (routeWorkspace || selected)) ??
    query.data?.find(item => item.is_default)
  useEffect(() => {
    if (!userData?.id) return

    try {setSelected(localStorage.getItem(`monolith.workspace.${userData.id}`) ?? '')}catch{setSelected('')}
  }, [userData?.id])

  function activate(id: string) {
    if (!query.data?.some(item => item.id === id)) return
    setSelected(id)
    if (userData?.id)
      rememberWorkspace(userData.id,id)
  }

  function select(id: string) {
    const workspace = query.data?.find(item => item.id === id)
    const agentsOnly = workspace?.enabled_modules.includes('agents') && (workspace.profile==='agents'||workspace.enabled_modules.length===1)
    navigate(`${agentsOnly ? '/agents' : '/databases'}?workspace=${id}`)
  }
  useEffect(() => {
    if (active?.id && userData?.id) {
      setSelected(active.id)
      rememberWorkspace(userData.id,active.id)
    }
  }, [active?.id, userData?.id])

  return (
    <Context
      value={{
        workspaces: query.data ?? [],
        active,
        select,
        activate,
        refresh: () =>
          cache.invalidateQueries({
            queryKey: workspaceAPI.workspaces.list.key
          }),
        loading: query.isLoading,
        error: query.error?.message
      }}
    >
      {children}
    </Context>
  )
}

