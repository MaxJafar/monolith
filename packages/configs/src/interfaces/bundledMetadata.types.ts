// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

import {
  modulePackageJSONSchema,
  navigationSectionSchema
} from './module.types'
import { widgetConfigSchema } from './widget.types'

export const bundledWidgetSchema = widgetConfigSchema.extend({
  componentName: z.string()
})
export const moduleBundledMetadataSchema = z.object({
  package: modulePackageJSONSchema,
  hasServer: z.boolean(),
  hasProvider: z.boolean(),
  widgets: z.array(bundledWidgetSchema),
  subsection: z.array(navigationSectionSchema).optional(),
  hidden: z.boolean().optional()
})
export type BundledWidget = z.infer<typeof bundledWidgetSchema>
export type ModuleBundledMetadata = z.infer<typeof moduleBundledMetadataSchema>
