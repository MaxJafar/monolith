import z from 'zod'

export const workspacesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const subjectsInput = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().max(1000000),
    icon: z.string().trim().max(255),
    workspace_id: z.uuid()
  })
  .strict()

export const entriesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    type: z.enum(['note', 'folder', 'file']),
    content: z.string().max(1000000),
    subject_id: z.uuid(),
    parent_id: z.uuid().nullable()
  })
  .strict()
