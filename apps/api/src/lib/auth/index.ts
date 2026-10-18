import { defineRoutes } from '@monolith/server-utils'

import * as loginRoutes from './routes/login'
import * as logoutRoutes from './routes/logout'
import * as oauthAuthRoutes from './routes/oauth/authorization'
import * as oauthProviderRoutes from './routes/oauth/providers'
import * as qrLoginRoutes from './routes/qrLogin'
import * as refreshRoutes from './routes/refresh'
import * as twoFARoutes from './routes/twoFA'

export default defineRoutes({
  '2fa': twoFARoutes,
  login: loginRoutes.login,
  logout: logoutRoutes.logout,
  oauth: defineRoutes({
    ...oauthAuthRoutes,
    providers: oauthProviderRoutes
  }),
  qrLogin: qrLoginRoutes,
  refresh: refreshRoutes.refresh
})
