// SPDX-License-Identifier: 0BSD
import type { Request, Response } from 'express'
import { z } from 'zod'

import {
  addonWireName,
  moduleManifestSchema,
  moduleSchema,
  moduleWidgetSchema
} from '@monolith/configs'
import { ModuleRegistry } from '@monolith/module-runtime/registry'

import endpoints from '../endpoints'

function wireNames(request: Request, response: Response) {
  response.vary('X-Monolith-Package-Names')
  const modern = request.get('X-Monolith-Package-Names') === '1'
  return (name: string) => addonWireName(name, modern)
}
export const checkModuleAvailability = endpoints
  .query({
    description: 'Resolve an installed addon identity',
    input: { query: z.object({ id: z.string().min(1) }) },
    output: { OK: z.boolean() }
  })
  .callback(async context =>
    context.response.ok(ModuleRegistry.isAvailable(context.query.id))
  )

export const manifest = endpoints
  .query({
    description: 'Read the current addon loading manifest',
    output: { OK: z.object({ modules: z.array(moduleManifestSchema) }) }
  })
  .callback(async context => {
    const name = wireNames(context.req, context.res)
    const modules = ModuleRegistry.manifests.map(module => ({
      ...module,
      name: name(module.name)
    }))
    return context.response.ok({ modules })
  })

export const list = endpoints
  .query({
    description: 'Inspect installed addon metadata',
    output: { OK: z.array(moduleSchema) }
  })
  .callback(async context => {
    const name = wireNames(context.req, context.res)
    return context.response.ok(
      ModuleRegistry.list.map(module => ({
        ...module,
        name: name(module.name)
      }))
    )
  })

export const widgets = endpoints
  .query({
    description: 'Read widgets registered by available addons',
    output: { OK: z.array(moduleWidgetSchema) }
  })
  .callback(async context => {
    const name = wireNames(context.req, context.res)
    return context.response.ok(
      ModuleRegistry.widgets.map(widget => ({
        ...widget,
        moduleName: name(widget.moduleName)
      }))
    )
  })
