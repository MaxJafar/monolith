import type { RoomAttachment } from '@monolith/api'

import workspaceAPI from '@/core/utils/workspaceAPI'

export type Room = Awaited<ReturnType<typeof workspaceAPI.rooms.list.query>>[number]

export type Timeline = Awaited<ReturnType<typeof workspaceAPI.rooms.timeline.query>>

export type Message = Timeline['messages'][number] & {
  attachments?: RoomAttachment[]
  encryptionError?: string
}

export type Entity = Message['references'][number]

export type Person = Awaited<
  ReturnType<typeof workspaceAPI.rooms.people.query>
>[number]

export type Draft = {
  body: string
  references: Entity[]
  transactionId: string
  attachments?: RoomAttachment[]
}

export const reactions = ['👍', '❤️', '🎉', '✅', '👀', '🚀'] as const

export const roomIcon = (room: Room) =>
  room.kind === 'direct'
    ? 'lucide:user'
    : room.kind === 'private'
      ? 'lucide:lock'
      : 'lucide:hash'
