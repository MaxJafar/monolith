import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import {
  agentRuntimeEndpoint,
  authenticateAgent
} from '../../../../../modules/zillion--agents/server/auth'
import type { Database } from '../../../../../modules/zillion--agents/server/store'

const JWT_SECRET = process.env.JWT_SIGNING_KEY!

function isAuthTokenValid(
  req: Request<unknown, unknown, unknown, unknown>,
  res: Response,
  noAuth: boolean
): boolean {
  if (noAuth) {
    return true
  }

  const bearerToken =
    req.headers.authorization?.split(' ')[1] ||
    (req.method === 'GET' && req.originalUrl.startsWith('/files/get')
      ? typeof req.cookies === 'object'
        ? req.cookies.access_token
        : undefined
      : undefined)

  if (!bearerToken) {
    res.status(401).send({
      state: 'error',
      message: 'Authorization token is required'
    })

    return false
  }

  try {
    const payload = jwt.verify(bearerToken, JWT_SECRET, {
      algorithms: ['HS512']
    })

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.sub
      )
    ) {
      throw new Error('Invalid token subject')
    }
    res.locals.userId = payload.sub
  } catch {
    res.status(401).send({
      state: 'error',
      message: 'Invalid authorization credentials'
    })

    return false
  }

  return true
}

/**
 * Runs authentication before the upload middleware so nothing is staged for
 * unauthenticated requests.
 */
export default function authMiddleware(noAuth: boolean) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1]

    if (token?.startsWith('za1.')) {
      if (!agentRuntimeEndpoint(req.method, req.originalUrl)) {
        res.status(403).send({
          state: 'error',
          message: 'Agent credentials can only access the agent runtime API'
        })

        return
      }

      try {
        const identity = await authenticateAgent(
          req.db as unknown as Database,
          token
        )

        if (!identity) {
          res.status(401).send({
            state: 'error',
            message: 'Invalid or unavailable agent credentials'
          })

          return
        }
        res.locals.userId = identity.owner
        res.locals.actorType = 'agent'
        res.locals.principalId = identity.principalId
        res.locals.credentialId = identity.credentialId
        next()
      } catch (error) {
        next(error)
      }

      return
    }

    if (isAuthTokenValid(req, res, noAuth)) {
      next()
    }
  }
}
