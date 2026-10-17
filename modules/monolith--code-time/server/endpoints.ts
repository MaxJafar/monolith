import { defineEndpoints } from '@monolith/server-utils'

import * as schema from './schema.drizzle'

export type CodeTimeSchema = typeof schema

const endpoints = defineEndpoints({
  schema,
  modulePathAlias: 'codeTime'
})

export default endpoints
