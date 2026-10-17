import z from 'zod'

export const categoriesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const statusesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    color: z.string().trim().max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const technologiesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const visibilitiesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const entriesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().max(1000000),
    color: z.string().trim().max(255),
    icon: z.string().trim().max(255),
    category_id: z.uuid().nullable(),
    status_id: z.uuid().nullable(),
    visibility_id: z.uuid().nullable(),
    technology_ids: z.array(z.uuid()).max(100)
  })
  .strict()

export const columnsInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    color: z.string().trim().max(255),
    icon: z.string().trim().max(255),
    project_id: z.uuid()
  })
  .strict()

export const tasksInput = z
  .object({
    title: z.string().trim().min(1).max(255),
    content: z.string().max(1000000),
    column_id: z.uuid(),
    completed: z.boolean()
  })
  .strict()
