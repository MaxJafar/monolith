import { createForgeContractBuilder } from '@lifeforge/server-utils'

import * as schema from './schema.drizzle'

export type CodeTimeSchema = typeof schema

const forge = createForgeContractBuilder({
  schema,
  modulePathAlias: 'codeTime'
})

export default forge
