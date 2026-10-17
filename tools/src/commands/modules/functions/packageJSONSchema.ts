import { modulePackageJSONSchema } from '@monolith/configs'
import z from 'zod'

export const packageJSONSchema = modulePackageJSONSchema.extend({
  scripts: z.object({ types: z.string().optional() }).passthrough().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional()
})
