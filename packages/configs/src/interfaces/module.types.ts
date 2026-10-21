// SPDX-License-Identifier: 0BSD
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react'
import { z } from 'zod'

import { widgetConfigSchema } from './widget.types'

export const navigationSectionSchema = z.object({
  label: z.string(),
  icon: z.string(),
  path: z.string()
})
export const apiKeyAccessSchema = z.record(
  z.string(),
  z.object({
    usage: z.string(),
    required: z.boolean()
  })
)
export const addonExperienceSchema = z.object({
  kind: z.enum([
    'widget',
    'dashboard',
    'database',
    'workbench',
    'overhaul',
    'standard'
  ]),
  surfaces: z.array(z.enum(['sidebar', 'page', 'dashboard', 'widget'])),
  databases: z.array(z.string().max(80)).optional(),
  systemOverrides: z
    .array(z.enum(['icons', 'labels', 'theme', 'navigation']))
    .optional()
})

const identity = {
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string()
}
const presentation = {
  icon: z.string(),
  category: z.string(),
  experience: addonExperienceSchema.optional()
}
const privileges = { APIKeyAccess: apiKeyAccessSchema.optional() }

export const modulePackageJSONSchema = z.object({
  ...identity,
  monolith: z.object({
    ...presentation,
    ...privileges,
    id: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
      .optional(),
    routeId: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional()
  })
})
export const moduleWidgetSchema = widgetConfigSchema.extend({
  moduleName: z.string(),
  componentName: z.string()
})
export const moduleEntrySchema = z.object({
  ...identity,
  ...presentation,
  ...privileges,
  id: z.string(),
  remoteId: z.string(),
  remoteEntryUrl: z.string(),
  hasProvider: z.boolean(),
  hidden: z.boolean().optional(),
  subsection: z.array(navigationSectionSchema).optional(),
  supportedLangs: z.array(z.string()),
  widgets: z.array(moduleWidgetSchema)
})
export const moduleSchema = moduleEntrySchema.pick({
  name: true,
  displayName: true,
  version: true,
  description: true,
  author: true,
  icon: true,
  category: true,
  experience: true,
  id: true,
  remoteId: true
})
export const moduleManifestSchema = moduleEntrySchema.omit({
  version: true,
  description: true,
  author: true,
  supportedLangs: true,
  widgets: true
})

type LazyPage = LazyExoticComponent<ComponentType>
type LazyProvider = LazyExoticComponent<ComponentType<{ children: ReactNode }>>
type WidgetLoader = () => Promise<{
  default: ComponentType<any>
  config: z.infer<typeof widgetConfigSchema>
}>
export const moduleConfigSchema = z.object({
  routes: z.record(z.string(), z.custom<LazyPage>()),
  provider: z.custom<LazyProvider>().optional(),
  widgets: z
    .array(z.custom<WidgetLoader>(value => typeof value === 'function'))
    .optional(),
  hidden: z.boolean().optional(),
  disabled: z
    .union([
      z.boolean(),
      z.custom<() => Promise<boolean>>(value => typeof value === 'function')
    ])
    .optional(),
  subsection: z.array(navigationSectionSchema).optional(),
  clearQueryOnUnmount: z.boolean().optional(),
  canvas: z.boolean().optional(),
  contract: z.any().optional()
})

export type ModuleConfig = z.infer<typeof moduleConfigSchema>
export type APIKeyAccess = z.infer<typeof apiKeyAccessSchema>
export type ModulePackageJSON = z.infer<typeof modulePackageJSONSchema>
export type ModuleWidget = z.infer<typeof moduleWidgetSchema>
export type ModuleEntry = z.infer<typeof moduleEntrySchema>
export type ModuleManifest = z.infer<typeof moduleManifestSchema>
export type Module = z.infer<typeof moduleSchema>
export interface ModuleGroup {
  title: string
  items: (ModuleConfig & {
    name: string
    id?: string
    remoteId?: string
    icon: string
    category: string
    APIKeyAccess?: APIKeyAccess
  })[]
}
