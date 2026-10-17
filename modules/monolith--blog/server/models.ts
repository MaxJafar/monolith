import z from 'zod'

export const categoriesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    color: z.string().trim().max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const entriesInput = z
  .object({
    title: z.string().trim().min(1).max(255),
    content: z.string().max(1000000),
    excerpt: z.string().max(1000000),
    visibility: z.enum(['private', 'public', 'unlisted']),
    category_id: z.uuid().nullable(),
    labels: z.string().trim().max(2000),
    featured_image: z.union([
      z.url({ protocol: /^https?$/ }).max(2048),
      z.literal('')
    ])
  })
  .strict()
