import z from 'zod'

export const roomQuery = z.object({ workspace_id: z.uuid(), room_id: z.uuid() })

export const workspaceQuery = z.object({ workspace_id: z.uuid() })
