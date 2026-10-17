import z from 'zod'

import {
  addonWireName,
  moduleManifestSchema,
  moduleSchema,
  moduleWidgetSchema
} from '@monolith/configs'
import { ModuleRegistry } from '@monolith/module-runtime/registry'

import endpoints from '../endpoints'

export const manifest = endpoints
  .query({
    description: 'Get installed modules manifest for runtime loading',
    input: {},
    output: {
      OK: z.object({
        modules: z.array(moduleManifestSchema)
      })
    }
  })
  .callback(async ({ req, res, response }) => {
    res.vary('X-Monolith-Package-Names')
    return response.ok({
      modules: ModuleRegistry.manifests.map(entry => ({
        ...entry,
        name: addonWireName(
          entry.name,
          req.get('X-Monolith-Package-Names') === '1'
        )
      }))
    })
  })

export const list = endpoints
  .query({
    description: 'List installed modules with metadata',
    input: {},
    output: {
      OK: z.array(moduleSchema)
    }
  })
  .callback(async ({ req, res, response }) => {
    res.vary('X-Monolith-Package-Names')
    return response.ok(
      ModuleRegistry.list.map(entry => ({
        ...entry,
        name: addonWireName(
          entry.name,
          req.get('X-Monolith-Package-Names') === '1'
        )
      }))
    )
  })

export const checkModuleAvailability = endpoints
  .query({
    description: 'Check if a module is available (installed)',
    input: {
      query: z.object({
        id: z.string().min(1)
      })
    },
    output: {
      OK: z.boolean()
    }
  })
  .callback(async ({ query: { id }, response }) =>
    response.ok(ModuleRegistry.isAvailable(id))
  )

export const widgets = endpoints
  .query({
    description: 'Get all available widgets configuration',
    input: {},
    output: {
      OK: z.array(moduleWidgetSchema)
    }
  })
  .callback(async ({ req, res, response }) => {
    res.vary('X-Monolith-Package-Names')
    return response.ok(
      ModuleRegistry.widgets.map(entry => ({
        ...entry,
        moduleName: addonWireName(
          entry.moduleName,
          req.get('X-Monolith-Package-Names') === '1'
        )
      }))
    )
  })
