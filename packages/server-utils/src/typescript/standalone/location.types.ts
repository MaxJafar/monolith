// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

const point = z.object({ latitude: z.number(), longitude: z.number() })
export const LocationSchema = z.object({
  name: z.string(),
  formattedAddress: z.string(),
  location: point
})
export type Location = z.infer<typeof LocationSchema>
