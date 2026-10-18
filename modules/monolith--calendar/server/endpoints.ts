import { defineEndpoints } from '@monolith/server-utils'

import * as schema from './schema.drizzle'

export type CalendarSchema = typeof schema

const endpoints = defineEndpoints({ schema })

export default endpoints
