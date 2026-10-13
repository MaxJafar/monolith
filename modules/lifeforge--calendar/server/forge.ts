import { createForgeContractBuilder } from '@lifeforge/server-utils'

import * as schema from './schema.drizzle'

export type CalendarSchema = typeof schema

const forge = createForgeContractBuilder({ schema })

export default forge
