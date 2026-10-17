import { defineEndpoints } from '@monolith/server-utils'

import type { CoreRelations } from '@/core/drizzle'

const endpoints = defineEndpoints<CoreRelations>({
  moduleId: 'apiKeys'
})

export default endpoints
