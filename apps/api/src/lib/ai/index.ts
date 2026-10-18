import { defineRoutes } from '@monolith/server-utils'

import * as imageGenerationRoutes from './routes/imageGeneration'
import * as sharedRoutes from './shared/routes'

export default defineRoutes({
  imageGeneration: imageGenerationRoutes,
  shared: sharedRoutes
})
