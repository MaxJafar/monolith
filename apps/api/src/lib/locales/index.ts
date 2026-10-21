// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { defineEndpoints, defineRoutes } from '@monolith/server-utils'

import type { CoreRelations } from '@/core/drizzle'

import {
  ALLOWED_NAMESPACE,
  LocaleService,
  canonicalLanguage
} from '../../core/functions/initialization/localeService'
import { installedLocaleSources, lookupLocale } from './catalog'

const api = defineEndpoints<CoreRelations>({ moduleId: 'locales' })
function catalog() {
  return {
    manifests: LocaleService.getLangManifests(),
    locales: LocaleService.getSystemLocales()
  }
}
export default defineRoutes({
  listLanguages: api
    .query({
      description: 'Read the installed language choices',
      noAuth: true,
      encrypted: false,
      rateLimit: false,
      input: {},
      output: {
        OK: z.array(
          z.object({
            name: z.string(),
            alternative: z.array(z.string()).optional(),
            icon: z.string(),
            displayName: z.string()
          })
        )
      }
    })
    .callback(async ({ response }) =>
      response.ok(LocaleService.getLangManifests())
    ),
  getLocale: api
    .query({
      description: 'Read a translated namespace',
      noAuth: true,
      rateLimit: false,
      input: {
        query: z.object({
          lang: z.string(),
          namespace: z.enum(ALLOWED_NAMESPACE),
          subnamespace: z
            .string()
            .regex(/^$|^@[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$|^[a-zA-Z0-9_.-]+$/)
        })
      },
      output: { OK: z.record(z.string(), z.any()) }
    })
    .callback(async ({ query, response }) => {
      const result = lookupLocale(catalog(), installedLocaleSources(), query)
      return result === null ? response.notFound() : response.ok(result)
    }),
  listUnsupportedModules: api
    .query({
      description: 'Read add-ons without the current account language',
      rateLimit: false,
      output: { OK: z.array(z.string()) }
    })
    .callback(async ({ db, res, response }) => {
      const account = await db.query.users.findFirst({
        where: { id: res.locals.userId as string }
      })
      const language =
        account?.language && canonicalLanguage(catalog(), account.language)
      if (!language) return response.notFound()
      const unsupported = ModuleRegistry.entries.filter(
        item =>
          !item.supportedLangs.some(
            code => code.toLowerCase() === language.toLowerCase()
          )
      )
      return response.ok(unsupported.map(item => item.name))
    })
})
