import { coreLogger } from '@functions/logging'
import type { RequestHandler } from 'express'

/** Request metadata only: query strings may contain search text or credentials. */
const requestLog: RequestHandler = (request, response, next) => {
  if (process.env.NODE_ENV !== 'test') {
    const started = performance.now()
    let recorded = false
    const complete = () => {
      if (recorded) return
      recorded = true
      response.off('finish', complete)
      response.off('close', complete)
      coreLogger.info(request.method + ' ' + request.path, {
        status: response.statusCode,
        elapsedMs: Math.round((performance.now() - started) * 100) / 100,
        completed: response.writableFinished
      })
    }
    response.once('finish', complete)
    response.once('close', complete)
  }
  next()
}
export default requestLog
