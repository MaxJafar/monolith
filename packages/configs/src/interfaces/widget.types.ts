// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

const optionalDimension = z.number().int().positive().optional()
export const widgetConfigSchema = z.object({
  id: z.string(),
  icon: z.string(),
  minW: optionalDimension,
  minH: optionalDimension,
  maxW: optionalDimension,
  maxH: optionalDimension
})
export type WidgetConfig = z.infer<typeof widgetConfigSchema>
