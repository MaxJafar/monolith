import { defineEndpoints } from '@monolith/server-utils'

import * as schema from './schema.drizzle'

export type IdeaBoxSchema = typeof schema

const endpoints = defineEndpoints({ schema })

export default endpoints
