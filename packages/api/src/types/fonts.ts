// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

// Wire fields follow https://developers.google.com/fonts/docs/developer_api.
// Variant names are provider data; a record also preserves variable-font files.
const family = z.object({
  kind: z.literal('webfonts#webfont'),
  family: z.string(),
  category: z.enum([
    'serif',
    'sans-serif',
    'monospace',
    'display',
    'handwriting'
  ]),
  variants: z.array(z.string()),
  subsets: z.array(z.string()),
  files: z.record(z.string(), z.string()),
  menu: z.string(),
  version: z.string(),
  lastModified: z.string(),
  colorCapabilities: z.array(z.enum(['COLRv0', 'COLRv1', 'SVG'])).optional()
})

export const GetGoogleFontResponseSchema = z.object({
  enabled: z.boolean(),
  items: family.array().optional()
})
