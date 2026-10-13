/**
 * @fileoverview Controller Logic - Business logic for Express.js route controllers
 *
 * This module provides the runtime logic for processing requests:
 * - Authentication validation
 * - Request/response validation using Zod schemas
 * - Built-in error handling and standardized responses
 * - Existence checking for referenced entities
 * - Encryption/decryption support
 * - File upload handling
 *
 * The main export is:
 * - `registerController`: Function to register a ForgeControllerBuilder with an Express router
 */
import { encryptResponse } from '@functions/encryption'
import { sql } from 'drizzle-orm'
import type { Request, Response, Router } from 'express'

import { scopeDbForModule } from '@lifeforge/drizzle'
import { fieldsUploadMiddleware } from '@lifeforge/file-storage/server'
import { ModuleRegistry } from '@lifeforge/module-runtime/registry'
import {
  BaseResponse,
  ForgeContract,
  checkRecordExistence,
  getStatusMessage,
  mapDatabaseError,
  observeMutation,
  serializeEndpointValue
} from '@lifeforge/server-utils'

import authMiddleware from '../../../middlewares/authMiddleware'
import { createCoreContext } from '../utils/coreContext'
import getAESKey from '../utils/getAESKey'
import parseBodyPayload from '../utils/parsePayload'
import parseQuery from '../utils/parseQuery'
import { clientError, serverError, success } from '../utils/response'

function isClientError(err: unknown): err is Error & { code: number } {
  return err instanceof Error && err.name === 'ClientError' && 'code' in err
}

class RejectedMutation extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown
  ) {
    super('Request rejected')
  }
}

function unpackResult(result: unknown): { status: number; payload: unknown } {
  if (result && typeof result === 'object' && '$status' in result) {
    return {
      status: typeof result.$status === 'number' ? result.$status : 200,
      payload: 'payload' in result ? result.payload : undefined
    }
  }

  return { status: 200, payload: result }
}

/**
 * Creates an Express request handler from a ForgeControllerBuilder's configuration.
 * This is kept private and only used internally by registerController.
 */
function createHandler(
  config: ReturnType<ForgeContract['getValue']>
): (req: Request, res: Response<BaseResponse<unknown>>) => Promise<void> {
  const {
    schema: input,
    noDefaultResponse,
    isDownloadable,
    media,
    encrypted,
    callback,
    callerModule,
    output
  } = config

  return async (req: Request, res: Response<BaseResponse<unknown>>) => {
    const callerModuleId = callerModule
      ? `${callerModule.source}:${callerModule.id}`
      : undefined

    const aesKey = getAESKey(req, res, encrypted, callerModuleId)

    try {
      parseQuery(req, input.query)

      parseBodyPayload(req, media || {}, encrypted, input.body)

      const execute = async (database: typeof req.db) => {
        await checkRecordExistence({
          db: database,
          querySchema: input.query,
          query: req.query,
          bodySchema: input.body,
          body: req.body
        })

        if (isDownloadable) {
          res.setHeader('X-LifeForge-Downloadable', 'true')
          res.setHeader(
            'Access-Control-Expose-Headers',
            'X-LifeForge-Downloadable'
          )
        }

        return await callback({
          req,
          res,
          io: req.io,
          db: scopeDbForModule(
            database,
            callerModule
              ? ModuleRegistry.getModuleKeyMap(callerModule.id)
              : undefined
          ),
          body: req.body,
          query: req.query,
          media: req.media || {},
          core: createCoreContext({
            module: callerModule as never,
            db: database
          })
        })
      }

      const userId = res.locals.userId as string | undefined
      const result = userId
        ? await req.db.transaction(async transaction => {
            await transaction.execute(
              sql`select set_config('zillion.user_id', ${userId}, true)`
            )
            const workspaceId =
              typeof req.query.workspace_id === 'string'
                ? req.query.workspace_id
                : typeof req.body?.workspace_id === 'string'
                  ? req.body.workspace_id
                  : undefined
            await observeMutation({
              db: transaction,
              userId,
              moduleId: callerModule?.id,
              phase: 'before',
              workspaceId
            })
            const result = await execute(transaction)

            const { status, payload } = unpackResult(result)

            if (status >= 400) {
              throw new RejectedMutation(status, payload)
            }

            if (config.method !== 'get')
              await observeMutation({
                db: transaction,
                userId,
                moduleId: callerModule?.id,
                workspaceId
              })

            return result
          })
        : await execute(req.db)

      if (res.headersSent) {
        return
      }

      if (noDefaultResponse || output === 'custom') {
        return
      }

      const { status, payload } = unpackResult(result)

      if (status >= 400) {
        return clientError({
          res,
          message: payload ?? getStatusMessage(status),
          code: status,
          moduleName: callerModuleId
        })
      }

      success(
        res,
        encrypted && aesKey
          ? (encryptResponse(payload, aesKey) as unknown)
          : payload,
        status
      )
    } catch (err) {
      if (err instanceof RejectedMutation) {
        return clientError({
          res,
          message: err.payload ?? getStatusMessage(err.status),
          code: err.status,
          moduleName: callerModuleId
        })
      }

      const databaseError = mapDatabaseError(err)

      if (databaseError) {
        return clientError({
          res,
          message: databaseError.message,
          code: databaseError.code,
          moduleName: callerModuleId
        })
      }

      if (isClientError(err)) {
        return clientError({
          res,
          message: err.message,
          code: err.code,
          moduleName: callerModuleId
        })
      }

      const cause = err instanceof Error ? err.cause : undefined

      serverError(
        res,
        err instanceof Error
          ? cause instanceof Error
            ? `${err.message} — ${cause.message}`
            : err.message
          : String(err),
        callerModule ? `${callerModule.source}:${callerModule.id}` : undefined
      )
    }
  }
}

/**
 * Registers a ForgeControllerBuilder with an Express router.
 * Creates the request handler with all business logic (auth, validation, encryption, error handling)
 * and mounts it on the router with appropriate middlewares.
 *
 * @param controller - The ForgeControllerBuilder instance to register
 * @param router - Express router instance to register the route with
 * @param routeName - The route path name (without leading slash)
 *
 * @example
 * ```typescript
 * const controller = forgeContract.mutation()
 *   .input({ body: z.object({ name: z.string() }) })
 *   .callback(async ({ body }) => ({ success: true }))
 *
 * registerController(controller, router, 'users')
 * // Registers POST /users
 * ```
 */
export function registerController(
  controller: ForgeContract,
  router: Router,
  routeName: string = ''
): void {
  const config = controller.getValue()

  const handler = Object.assign(createHandler(config), {
    meta: {
      ...serializeEndpointValue(config),
      callerModule: config.callerModule
    }
  })

  router[config.method](
    `/${routeName}`,
    [
      authMiddleware(config.noAuth),
      ...(Object.keys(config.media ?? {}).length > 0
        ? [
            fieldsUploadMiddleware(
              Object.fromEntries(
                Object.entries(config.media ?? {}).map(([key, value]) => [
                  key,
                  value.multiple ? 999 : 1
                ])
              )
            )
          ]
        : []),
      ...config.middlewares
    ],
    handler
  )
}
