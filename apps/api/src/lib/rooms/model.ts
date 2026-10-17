import z from 'zod'

import { entityDto, entityKey } from '../entities/model'
import { sealedDto } from './encryption'

export { roomQuery, workspaceQuery } from './scope'

export const roomDto = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  created_by: z.uuid(),
  name: z.string(),
  topic: z.string(),
  kind: z.enum(['channel', 'private', 'direct']),
  member_ids: z.array(z.uuid()),
  archived: z.boolean(),
  revision: z.number(),
  last_seq: z.number(),
  updated: z.string(),
  unread: z.number(),
  mentions: z.number(),
  muted: z.boolean(),
  can_write: z.boolean(),
  can_manage: z.boolean()
})

export const messageDto = z.object({
  id: z.uuid(),
  room_id: z.uuid(),
  author_id: z.uuid(),
  author_name: z.string(),
  seq: z.number(),
  thread_id: z.uuid().nullable(),
  transaction_id: z.uuid(),
  sealed: sealedDto.nullable(),
  body: z.string(),
  references: z.array(entityDto),
  revision: z.number(),
  deleted: z.boolean(),
  pinned: z.boolean(),
  created: z.string(),
  edited: z.string().nullable(),
  replies: z.number(),
  reactions: z.array(
    z.object({ emoji: z.string(), count: z.number(), mine: z.boolean() })
  )
})

export const messageInput = z
  .object({
    body: z.string().trim().max(16000),
    sealed: sealedDto.optional(),
    references: z.array(entityKey).max(20).default([])
  })
  .refine(
    value =>
      !!value.sealed || value.body.length > 0 || value.references.length > 0,
    'Write a message or mention an item'
  )

export const emojis = ['👍', '❤️', '🎉', '✅', '👀', '🚀'] as const

export type Room = z.infer<typeof roomDto>

export type Message = z.infer<typeof messageDto>
