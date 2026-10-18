import type { Response } from 'express'

import { createLogger } from '@monolith/log'
import type { BaseResponse } from '@monolith/server-utils'

const log = createLogger({ name: 'http' })

export function clientError({
  res,
  message = 'Bad Request',
  code = 400,
  moduleName = 'core'
}: {
  res: Response
  message?: unknown
  code?: number
  moduleName?: string
}): void {
  if (res.headersSent) return
  log.warn(typeof message === 'string' ? message : 'Request rejected', {
    status: code,
    module: moduleName
  })
  res.status(code).json({ state: 'error', message })
}

export function serverError(
  res: Response,
  error = 'Internal server error',
  moduleName = 'core'
): void {
  log.error(error, { module: moduleName })
  if (!res.headersSent)
    res.status(500).json({
      state: 'error',
      message:
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error
    })
}

export function success<T>(
  res: Response<BaseResponse<T>>,
  data: T,
  status = 200
): void {
  if (res.headersSent) return
  if (status === 204) {
    res.status(status).end()
    return
  }
  res.status(status).json({ state: 'success', data })
}
