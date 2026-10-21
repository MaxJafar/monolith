// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

// Stored property names are a compatibility boundary for existing databases.
const thumbnail = z.object({
  key: z.string(),
  size: z.string(),
  width: z.number(),
  height: z.number()
})
export const fileReferenceSchema = z.object({
  originalName: z.string(),
  mimeType: z.string(),
  key: z.string(),
  size: z.number(),
  thumbs: thumbnail.array()
})
export type FileReference = z.infer<typeof fileReferenceSchema>
export type ThumbnailInfo = z.infer<typeof thumbnail>
