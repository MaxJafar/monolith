import { type Context, createContext, useContext } from 'react'

import type { useRoomsState } from './RoomsProvider'

type RoomsState = ReturnType<typeof useRoomsState>

export const RoomsContext: Context<RoomsState | null> =
  createContext<RoomsState | null>(null)

export function useRooms(): RoomsState {
  const context = useContext(RoomsContext)

  if (!context) throw Error('Rooms provider missing')

  return context
}
