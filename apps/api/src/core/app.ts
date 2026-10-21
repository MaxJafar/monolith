// SPDX-License-Identifier: 0BSD
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type RequestHandler } from 'express'
import helmet from 'helmet'

import { db } from './drizzle'
import rateLimitingMiddleware from './middlewares/rateLimitingMiddleware'
import requestLogging from './middlewares/requestLogging'
import router from './routes'
import { CORS_ALLOWED_ORIGINS } from './routes/constants/corsAllowedOrigins'

const databaseContext: RequestHandler = (request, _response, next) => {
  request.db = db
  next()
}
const app = express()
app.use([
  databaseContext,
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    xPoweredBy: false,
    xXssProtection: false
  }),
  cors({ origin: CORS_ALLOWED_ORIGINS, credentials: true }),
  cookieParser(),
  express.raw(),
  express.json({ limit: '50mb' }),
  requestLogging,
  rateLimitingMiddleware
])
app.use(router)
export default app
