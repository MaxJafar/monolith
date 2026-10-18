import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import z from 'zod'

import { defineEndpoints } from './contracts'

describe('defineEndpoints', () => {
  it('should construct query contract and register a callback', () => {
    const endpoints = defineEndpoints()

    const contract = endpoints
      .query({
        description: 'Test Query',
        input: {
          query: z.object({
            id: z.string()
          })
        },
        output: {
          OK: z.object({
            message: z.string()
          })
        }
      })
      .callback(async ({ query, response }) => {
        return response.ok({ message: `Hello ${query?.id}` })
      })

    expect(contract.__isEndpointContract).toBe(true)

    const val = contract.getValue()

    expect(val.method).toBe('get')
    expect(val.description).toBe('Test Query')
  })

  it('should default rateLimit to true', () => {
    const endpoints = defineEndpoints()
    const contract = endpoints
      .query({
        description: 'Test rateLimit default',
        output: {
          OK: z.string()
        }
      })
      .callback(async ({ response }) => {
        return response.ok('test')
      })

    const val = contract.getValue()
    expect(val.rateLimit).toBe(true)
  })

  it('should set rateLimit to false if explicitly defined', () => {
    const endpoints = defineEndpoints()
    const contract = endpoints
      .query({
        description: 'Test rateLimit false',
        rateLimit: false,
        output: {
          OK: z.string()
        }
      })
      .callback(async ({ response }) => {
        return response.ok('test')
      })

    const val = contract.getValue()
    expect(val.rateLimit).toBe(false)
  })

  it('should expose a typed existsIn bound to the module schema', () => {
    const users = pgTable('users', { id: uuid('id').primaryKey() })
    const endpoints = defineEndpoints({
      schema: { tables: { users }, relations: () => ({}) }
    })

    const schema = z.string()

    expect(endpoints.existsIn(schema, users)).toBe(schema)
  })
})
