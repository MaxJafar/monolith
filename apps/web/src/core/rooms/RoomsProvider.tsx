import { useAuth, useSocketContext } from '@monolith/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { RoomsContext } from './RoomsContext'
import { useRoomsDrafts } from './RoomsDrafts'

export function useRoomsState() {
  const { userData } = useAuth()
  const { active } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const cache = useQueryClient()
  const socket = useSocketContext()
  const [connected, setConnected] = useState(socket.connected)
  const [typing, setTyping] = useState<Record<string, number>>({})
  const drafts = useRoomsDrafts()

  const workspaceId = active?.id ?? ''
  const actor = userData?.id ?? ''
  const options = workspaceAPI.rooms.list
    .input({ workspace_id: workspaceId })
    .queryOptions()
  const directory = useQuery({
    ...options,
    queryKey: [...options.queryKey, actor],
    enabled: !!workspaceId && !!actor,
    refetchInterval: 8000
  })
  const rooms = directory.error ? [] : (directory.data ?? [])
  const roomId =
    params.get('room') ?? rooms.find(room => !room.archived)?.id ?? ''
  const room = rooms.find(room => room.id === roomId)
  const watchedRoomId = room?.id ?? ''
  const threadId = params.get('thread') ?? undefined
  const scope = { workspace_id: workspaceId, room_id: roomId }
  const peopleOptions = workspaceAPI.rooms.people
    .input({ workspace_id: workspaceId })
    .queryOptions()
  const people = useQuery({
    ...peopleOptions,
    queryKey: [...peopleOptions.queryKey, actor],
    enabled: !!workspaceId && !!actor,
    staleTime: 15000
  })
  const refresh = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: workspaceAPI.rooms.key })
  }, [cache])

  function selectRoom(id: string) {
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('room', id)
      next.set('workspace', workspaceId)
      next.delete('thread')
      next.delete('message')

      return next
    })
  }

  function openThread(id?: string) {
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('room', roomId)
      next.set('workspace', workspaceId)
      if (id) next.set('thread', id)
      else next.delete('thread')

      return next
    })
  }
  useEffect(() => {
    let stopped = false
    let retry: number | undefined

    const watch = () => {
      if (!socket.connected || !watchedRoomId || stopped) return
      socket.emit(
        'rooms:watch',
        { workspace_id: workspaceId, room_id: watchedRoomId },
        (result: { ok: boolean }) => {
          if (!result.ok && !stopped) retry = window.setTimeout(watch, 1000)
        }
      )
    }
    const update = () => {
      setConnected(socket.connected)
      watch()
      void refresh()
    }
    const changed = (event: { workspace_id: string; room_id: string }) => {
      if (event.workspace_id === workspaceId) void refresh()
    }
    const revoked = (event: { workspace_id: string; room_id: string }) => {
      if (event.workspace_id !== workspaceId) return
      cache.removeQueries({ queryKey: workspaceAPI.rooms.timeline.key })
      drafts.current.clear()
      setTyping({})
      void refresh()
    }
    const onTyping = (event: {
      workspace_id: string
      room_id: string
      actor_id: string
    }) => {
      if (
        event.workspace_id === workspaceId &&
        event.room_id === roomId &&
        event.actor_id !== actor
      )
        setTyping(current => ({
          ...current,
          [event.actor_id]: performance.now() + 6000
        }))
    }
    socket.on('connect', update)
    socket.on('disconnect', update)
    socket.on('rooms:changed', changed)
    socket.on('rooms:revoked', revoked)
    socket.on('rooms:typing', onTyping)
    watch()
    const timer = window.setInterval(
      () =>
        setTyping(current => {
          const entries = Object.entries(current).filter(
            ([, expires]) => expires > performance.now()
          )

          return entries.length === Object.keys(current).length
            ? current
            : Object.fromEntries(entries)
        }),
      2000
    )

    return () => {
      stopped = true
      window.clearTimeout(retry)
      socket.emit('rooms:unwatch')
      socket.off('connect', update)
      socket.off('disconnect', update)
      socket.off('rooms:changed', changed)
      socket.off('rooms:revoked', revoked)
      socket.off('rooms:typing', onTyping)
      window.clearInterval(timer)
    }
  }, [
    socket,
    roomId,
    watchedRoomId,
    workspaceId,
    actor,
    refresh,
    cache,
    drafts
  ])
  useEffect(() => {
    setTyping({})
  }, [roomId])

  return {
    active,
    actor,
    workspaceId,
    scope,
    rooms,
    room,
    roomId,
    threadId,
    directory,
    people,
    connected,
    typing: Object.keys(typing)
      .map(id => people.data?.find(person => person.id === id)?.name)
      .filter(Boolean),
    selectRoom,
    openThread,
    refresh,
    drafts,
    signalTyping: () => {
      socket.emit('rooms:typing', scope)
    }
  }
}

export function RoomsProvider({ children }: { children: ReactNode }) {
  const value = useRoomsState()

  return <RoomsContext value={value}>{children}</RoomsContext>
}
