import { createForgeContractBuilder } from '@lifeforge/server-utils'

import * as schema from './schema.drizzle'

const forge = createForgeContractBuilder({ schema })

export default forge
