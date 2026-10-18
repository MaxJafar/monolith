import { decryptAESKey, encryptResponse } from '@functions/encryption'
import { sql } from 'drizzle-orm'
import type { Request, RequestHandler, Response, Router } from 'express'

import { scopeDbForModule } from '@monolith/drizzle'
import { fieldsUploadMiddleware } from '@monolith/file-storage/server'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import {
  ClientError,
  type EndpointContract,
  checkRecordExistence,
  getStatusMessage,
  mapDatabaseError,
  observeMutation,
  serializeEndpointValue
} from '@monolith/server-utils'

import authMiddleware from '../../middlewares/authMiddleware'
import { parseRequestInput } from './requestInput'
import { createCoreContext } from './utils/coreContext'
import { clientError, serverError, success } from './utils/response'

type Configuration = ReturnType<EndpointContract['getValue']>
type Result = { status: number; payload: unknown }

class RejectedRequest extends Error {
  constructor(readonly result: Result) {
    super('Endpoint rejected the request')
  }
}

function resultOf(value: unknown): Result {
  if (!value || typeof value !== 'object' || !('$status' in value))
    return { status: 200, payload: value }
  const status = value.$status
  if (
    typeof status !== 'number' ||
    !Number.isInteger(status) ||
    status < 200 ||
    status > 599
  )
    throw new Error('Invalid endpoint response status')
  return { status, payload: 'payload' in value ? value.payload : undefined }
}

function responseKey(request: Request, encrypted: boolean): Buffer | null {
  if (!encrypted || request.method !== 'GET') return null
  const header = request.headers['x-monolith-key']
  if (header === undefined) return null
  try {
    if (typeof header !== 'string') throw new Error('Invalid header')
    return decryptAESKey(header)
  } catch {
    throw new ClientError('Failed to decrypt encryption key', 400)
  }
}

export function createEndpointHandler(config: Configuration) {
  const source = config.callerModule
  const moduleName = source ? source.source + ':' + source.id : 'core'
  return async (request: Request, response: Response): Promise<void> => {
    try {
      // Parse all client input before acquiring an authenticated transaction.
      const key = responseKey(request, config.encrypted)
      parseRequestInput(request, config)
      const invoke = async (database: Request['db']): Promise<Result> => {
        await checkRecordExistence({
          db: database,
          querySchema: config.schema.query,
          bodySchema: config.schema.body,
          query: request.query,
          body: request.body
        })
        if (config.isDownloadable) {
          response.setHeader('X-Monolith-Downloadable', 'true')
          response.append(
            'Access-Control-Expose-Headers',
            'X-Monolith-Downloadable'
          )
        }
        const raw = await config.callback({
          req: request,
          res: response,
          io: request.io,
          db: scopeDbForModule(
            database,
            source ? ModuleRegistry.getModuleKeyMap(source.id) : undefined
          ),
          body: request.body,
          query: request.query,
          media: request.media ?? {},
          core: createCoreContext({
            db: database,
            module: source as Parameters<typeof createCoreContext>[0]['module']
          })
        })
        const result = resultOf(raw)
        if (result.status >= 400) throw new RejectedRequest(result)
        return result
      }

      const userId = response.locals.userId as string | undefined
      let result: Result
      if (!userId) result = await invoke(request.db)
      else
        result = await request.db.transaction(async transaction => {
          // This setting is the persisted row-policy ABI, independent of product branding.
          await transaction.execute(
            sql`select set_config('zillion.user_id', ${userId}, true)`
          )
          const workspaceId =
            typeof request.query.workspace_id === 'string'
              ? request.query.workspace_id
              : typeof request.body?.workspace_id === 'string'
                ? request.body.workspace_id
                : undefined
          const observation = {
            db: transaction,
            userId,
            moduleId: source?.id,
            workspaceId
          }
          await observeMutation({ ...observation, phase: 'before' })
          const completed = await invoke(transaction)
          if (config.method !== 'get') await observeMutation(observation)
          return completed
        })

      if (
        response.headersSent ||
        config.noDefaultResponse ||
        config.output === 'custom'
      )
        return
      success(
        response,
        key ? encryptResponse(result.payload, key) : result.payload,
        result.status
      )
    } catch (failure) {
      if (response.headersSent) return
      if (failure instanceof RejectedRequest) {
        clientError({
          res: response,
          moduleName,
          code: failure.result.status,
          message:
            failure.result.payload ?? getStatusMessage(failure.result.status)
        })
        return
      }
      const mapped = mapDatabaseError(failure)
      const expected =
        mapped ??
        (failure instanceof Error &&
        failure.name === 'ClientError' &&
        'code' in failure &&
        typeof failure.code === 'number'
          ? (failure as ClientError)
          : null)
      if (expected)
        clientError({
          res: response,
          moduleName,
          code: expected.code,
          message: expected.message
        })
      else
        serverError(
          response,
          failure instanceof Error ? failure.message : String(failure),
          moduleName
        )
    }
  }
}

export function registerController(
  contract: EndpointContract,
  router: Router,
  routeName = ''
): void {
  const config = contract.getValue()
  const chain: RequestHandler[] = [authMiddleware(config.noAuth)]
  const fields = Object.entries(config.media ?? {})
  if (fields.length)
    chain.push(
      fieldsUploadMiddleware(
        Object.fromEntries(
          fields.map(([name, specification]) => [
            name,
            specification.multiple ? 999 : 1
          ])
        )
      )
    )
  chain.push(...config.middlewares)
  const handler = Object.assign(createEndpointHandler(config), {
    meta: {
      ...serializeEndpointValue(config),
      callerModule: config.callerModule
    }
  })
  router[config.method]('/' + routeName, chain, handler)
}
