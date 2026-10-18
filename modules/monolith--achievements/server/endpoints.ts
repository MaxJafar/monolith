import { defineEndpoints } from '@monolith/server-utils'

import * as schema from './schema.drizzle'

const endpoints = defineEndpoints({ schema })

export default endpoints
