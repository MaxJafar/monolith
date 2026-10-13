import { createForgeContractBuilder } from '@lifeforge/server-utils'

import * as schema from './schema.drizzle'

export default createForgeContractBuilder({
  schema,
  modulePathAlias: 'modules/zillion--agents'
})
