import { useAuth } from '@monolith/api'
import {
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useMemo
} from 'react'

import type { Draft } from './types'

const Drafts = createContext<RefObject<Map<string, Draft>> | null>(null)

/** In-memory drafts survive item navigation, but never persist across accounts or a reload. */
export function RoomsDraftsProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()

  const value = useMemo(
    () => ({ current: new Map<string, Draft>() }),
    [userData?.id]
  )

  return <Drafts value={value}>{children}</Drafts>
}

export function useRoomsDrafts() {
  const drafts = useContext(Drafts)

  if (!drafts) throw Error('RoomsDraftsProvider is required')

  return drafts
}
