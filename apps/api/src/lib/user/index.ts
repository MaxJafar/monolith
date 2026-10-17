import z from 'zod'

import { defineRoutes } from '@monolith/server-utils'

import endpoints from './endpoints'
import * as authRoutes from './routes/auth'
import * as meRoutes from './routes/me'
import * as pageRoutes from './routes/pages'
import * as personalizationRoutes from './routes/personalization'
import * as settingsRoutes from './routes/settings'

export default defineRoutes({
  exists: endpoints
    .query({
      description: 'Check if user exists',
      noAuth: true,
      input: {},
      output: {
        OK: z.boolean()
      }
    })
    .callback(async ({ db, response }) => {
      const user = await db.query.users.findFirst()

      return response.ok(Boolean(user))
    }),
  auth: authRoutes,
  me: meRoutes.me,
  settings: settingsRoutes,
  personalization: personalizationRoutes,
  pages: pageRoutes
})
