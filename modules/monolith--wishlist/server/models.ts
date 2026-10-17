import z from 'zod'

export const listsInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().max(1000000),
    color: z.string().trim().max(255),
    icon: z.string().trim().max(255)
  })
  .strict()

export const entriesInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    url: z.union([z.url({ protocol: /^https?$/ }).max(2048), z.literal('')]),
    price: z.number().finite().min(0).max(1000000000),
    list_id: z.uuid(),
    image: z.union([z.url({ protocol: /^https?$/ }).max(2048), z.literal('')]),
    bought: z.boolean()
  })
  .strict()
