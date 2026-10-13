import { forgeRouter } from '@lifeforge/server-utils'

import * as imageGenerationRoutes from './routes/imageGeneration'
import * as sharedRoutes from './shared/routes'

export default forgeRouter({
  imageGeneration: imageGenerationRoutes,
  shared: sharedRoutes
})
