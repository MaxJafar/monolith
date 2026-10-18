import { defineEndpoints } from '@monolith/server-utils'

import * as schema from './schema.drizzle'

export type TodoListSchema = typeof schema

const endpoints = defineEndpoints({ schema })

export default endpoints
