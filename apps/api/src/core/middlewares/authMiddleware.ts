// SPDX-License-Identifier: 0BSD
import type { NextFunction, Request, Response } from 'express'

import {
  agentRuntimeEndpoint,
  authenticateAgent
} from '../../../../../modules/monolith--agents/server/auth'
import type { Database } from '../../../../../modules/monolith--agents/server/store'
import { verifyApplicationToken } from '../functions/deviceSession'

function bearer(request: Request): string | undefined {
  return /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '')?.[1]
}
function fileCookie(request: Request): string | undefined {
  if (request.method !== 'GET' || !request.originalUrl.startsWith('/files/get'))
    return
  const value: unknown = request.cookies?.access_token
  return typeof value === 'string' ? value : undefined
}
function reject(response: Response, status: number, message: string): void {
  response.status(status).send({ state: 'error', message })
}

export default function authMiddleware(noAuth: boolean) {
  return async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    const token = bearer(request)
    if (token?.startsWith('za1.')) {
      if (!agentRuntimeEndpoint(request.method, request.originalUrl)) {
        reject(
          response,
          403,
          'Agent credentials can only access the agent runtime API'
        )
        return
      }
      try {
        const principal = await authenticateAgent(
          request.db as unknown as Database,
          token
        )
        if (!principal) {
          reject(response, 401, 'Invalid or unavailable agent credentials')
          return
        }
        Object.assign(response.locals, {
          userId: principal.owner,
          actorType: 'agent',
          principalId: principal.principalId,
          credentialId: principal.credentialId
        })
        next()
      } catch (error) {
        next(error)
      }
      return
    }
    if (noAuth) {
      next()
      return
    }
    const credential = token ?? fileCookie(request)
    if (!credential) {
      reject(response, 401, 'Authorization token is required')
      return
    }
    try {
      const identity = await verifyApplicationToken(credential)
      if (
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
          identity.sub ?? ''
        )
      ) {
        throw new Error('Invalid account identifier')
      }
      response.locals.userId = identity.sub
    } catch {
      reject(response, 401, 'Invalid authorization credentials')
      return
    }
    next()
  }
}
