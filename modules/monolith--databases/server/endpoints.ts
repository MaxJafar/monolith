import { defineEndpoints } from '@monolith/server-utils'

import * as schema from './schema.drizzle'

export default defineEndpoints({ schema, schemaOwnerId: 'monolith--databases' })
