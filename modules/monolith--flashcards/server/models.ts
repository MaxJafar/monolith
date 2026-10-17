import z from 'zod'

export const tagsInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    color: z.string().trim().max(255)
  })
  .strict()

export const decksInput = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().max(1000000),
    tag_id: z.uuid().nullable()
  })
  .strict()

export const cardsInput = z
  .object({
    question: z.string().min(1).max(1000000),
    answer: z.string().min(1).max(1000000),
    deck_id: z.uuid()
  })
  .strict()
