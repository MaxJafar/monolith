import dayjs from 'dayjs'
import {
  and,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql
} from 'drizzle-orm'
import fs from 'fs'
import z from 'zod'

import { LocationSchema, requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import {
  walletAssets,
  walletCategories,
  walletLedgers,
  walletPlatforms,
  walletTransactions,
  walletTransactionsIncomeExpenses,
  walletTransactionsTransfer
} from '../schema.drizzle'
import { RANGE_MODE, resolveDateRange } from '../utils/dateRange'
import {
  EnrichedTransactionOutput,
  enrichedTransactionQuery,
  mapToEnrichedTransaction,
  transactionDto
} from '../utils/enrichedTransaction'
import { getTransactionDetails } from '../utils/transactions'

const MutateTransactionInputSchema = z.union([
  z.object({
    type: z.enum(['income', 'expenses']),
    amount: z.number().finite().nonnegative(),
    date: z
      .string()
      .refine(
        value => !value || dayjs(value).isValid(),
        'Invalid transaction date'
      )
      .optional(),
    particulars: z.string().optional(),
    asset: z
      .union([forge.existsIn(z.string().uuid(), walletAssets), z.literal('')])
      .optional(),
    category: z
      .union([
        forge.existsIn(z.string().uuid(), walletCategories),
        z.literal('')
      ])
      .optional(),

    platform: z
      .union([
        forge.existsIn(z.string().uuid(), walletPlatforms),
        z.literal('')
      ])
      .optional(),
    ledgers: forge
      .existsIn(z.array(z.string().uuid()), walletLedgers)
      .optional(),
    location: LocationSchema.optional().nullable()
  }),
  z
    .object({
      type: z.literal('transfer'),
      amount: z.number().finite().nonnegative(),
      date: z
        .string()
        .refine(
          value => !value || dayjs(value).isValid(),
          'Invalid transaction date'
        )
        .optional(),
      from: forge.existsIn(z.string().uuid(), walletAssets),
      to: forge.existsIn(z.string().uuid(), walletAssets)
    })
    .refine(
      value => value.from !== value.to,
      'Transfer assets must be different'
    )
])

function mapIncomeExpenses(data: z.infer<typeof MutateTransactionInputSchema>) {
  if (data.type === 'transfer') {
    return null
  }

  return {
    particulars: data.particulars ?? '',
    asset: data.asset || null,
    category: data.category || null,
    platform: data.platform || null,
    ledgers: data.ledgers ?? [],
    location_name: data.location?.name ?? '',
    location_coords: {
      lon: data.location?.location.longitude ?? 0,
      lat: data.location?.location.latitude ?? 0
    }
  }
}

export const list = forge
  .query({
    description: 'Get paginated wallet transactions',
    input: {
      query: z.object({
        q: z.string().optional(),
        type: z.enum(['income', 'expenses', 'transfer']).optional(),
        category: z
          .union([
            forge.existsIn(z.string().uuid(), walletCategories),
            z.literal('')
          ])
          .optional(),
        platform: z
          .union([
            forge.existsIn(z.string().uuid(), walletPlatforms),
            z.literal('')
          ])
          .optional(),
        asset: z
          .union([
            forge.existsIn(z.string().uuid(), walletAssets),
            z.literal('')
          ])
          .optional(),
        ledger: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        range: RANGE_MODE.optional(),
        page: z.string().optional(),
        perPage: z.string().optional()
      })
    },
    output: {
      OK: z.object({
        groups: z.array(
          z.object({
            date: z.string(),
            items: z.array(EnrichedTransactionOutput)
          })
        ),
        page: z.number(),
        perPage: z.number(),
        totalItems: z.number(),
        totalPages: z.number()
      })
    }
  })
  .callback(
    async ({
      db,
      query: {
        q,
        type,
        category,
        platform,
        asset,
        ledger,
        startDate,
        endDate,
        range,
        page,
        perPage
      },
      response
    }) => {
      const parsedPage = parseInt(page ?? '1', 10) || 1

      const parsedPerPage = parseInt(perPage ?? '25', 10) || 25

      const conditions = []

      if (startDate) {
        conditions.push(
          gte(walletTransactions.date, dayjs(startDate).startOf('day').toDate())
        )
      }

      if (endDate) {
        conditions.push(
          lte(walletTransactions.date, dayjs(endDate).endOf('day').toDate())
        )
      }

      if (range) {
        const dateRange = resolveDateRange(range, startDate, endDate)

        if (dateRange.startDate) {
          conditions.push(
            gte(
              walletTransactions.date,
              dayjs(dateRange.startDate).startOf('day').toDate()
            )
          )
        }

        if (dateRange.endDate) {
          conditions.push(
            lte(
              walletTransactions.date,
              dayjs(dateRange.endDate).endOf('day').toDate()
            )
          )
        }
      }

      if (type === 'transfer') {
        conditions.push(eq(walletTransactions.type, 'transfer'))
      } else if (type === 'income' || type === 'expenses') {
        conditions.push(eq(walletTransactionsIncomeExpenses.type, type))
      }

      if (q) {
        conditions.push(
          or(
            ilike(walletTransactionsIncomeExpenses.particulars, `%${q}%`),
            ilike(walletTransactionsIncomeExpenses.location_name, `%${q}%`)
          )
        )
      }

      if (category) {
        conditions.push(eq(walletTransactionsIncomeExpenses.category, category))
      }

      if (platform) {
        conditions.push(eq(walletTransactionsIncomeExpenses.platform, platform))
      }

      if (asset) {
        conditions.push(
          or(
            and(
              eq(walletTransactions.type, 'income_expenses'),
              eq(walletTransactionsIncomeExpenses.asset, asset)
            ),
            and(
              eq(walletTransactions.type, 'transfer'),
              or(
                eq(walletTransactionsTransfer.from, asset),
                eq(walletTransactionsTransfer.to, asset)
              )
            )
          )
        )
      }

      if (ledger) {
        conditions.push(
          sql`jsonb_exists(${walletTransactionsIncomeExpenses.ledgers}, ${ledger})`
        )
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await enrichedTransactionQuery(db)
        .where(where)
        .orderBy(
          desc(walletTransactions.date),
          desc(walletTransactions.created)
        )
        .limit(parsedPerPage)
        .offset((parsedPage - 1) * parsedPerPage)

      const [totalRow] = await db
        .select({ value: countDistinct(walletTransactions.id) })
        .from(walletTransactions)
        .leftJoin(
          walletTransactionsIncomeExpenses,
          eq(
            walletTransactionsIncomeExpenses.base_transaction,
            walletTransactions.id
          )
        )
        .leftJoin(
          walletTransactionsTransfer,
          eq(walletTransactionsTransfer.base_transaction, walletTransactions.id)
        )
        .where(where)

      const groups = rows
        .map(({ base, sub, transfer, asset, category, platform, ledger }) =>
          mapToEnrichedTransaction(base, sub, transfer, {
            asset,
            category,
            platform,
            ledger
          })
        )
        .reduce<
          {
            date: string
            items: ReturnType<typeof mapToEnrichedTransaction>[]
          }[]
        >((acc, item) => {
          const date = dayjs(item.date).format('YYYY-MM-DD')
          const lastGroup = acc[acc.length - 1]

          if (!lastGroup || lastGroup.date !== date) {
            acc.push({ date, items: [item] })
          } else {
            lastGroup.items.push(item)
          }

          return acc
        }, [])

      return response.ok({
        groups,
        page: parsedPage,
        perPage: parsedPerPage,
        totalItems: totalRow?.value ?? 0,
        totalPages: Math.ceil((totalRow?.value ?? 0) / parsedPerPage)
      })
    }
  )

export const getById = forge
  .query({
    description: 'Get wallet transaction by ID',
    input: {
      query: z.object({ id: forge.existsIn(z.string(), walletTransactions) })
    },
    output: {
      OK: EnrichedTransactionOutput
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const [row] = await enrichedTransactionQuery(db).where(
      eq(walletTransactions.id, id)
    )

    const { base, sub, transfer, asset, category, platform, ledger } =
      requireResult(row)

    return response.ok(
      mapToEnrichedTransaction(base, sub, transfer, {
        asset,
        category,
        platform,
        ledger
      })
    )
  })

export const create = forge
  .mutation({
    description: 'Create a new transaction with receipt',
    input: {
      body: MutateTransactionInputSchema
    },
    media: {
      receipt: {
        optional: true
      }
    },
    output: {
      CREATED: transactionDto
    }
  })
  .callback(
    async ({
      db,
      body,
      media: { receipt: rawReceipt },
      core: {
        media: { convertPDFToImage },
        storage
      },
      response
    }) => {
      let receiptKey = ''

      if (rawReceipt && typeof rawReceipt !== 'string') {
        if (rawReceipt.originalName.endsWith('.pdf')) {
          const image = await convertPDFToImage(rawReceipt.path)

          if (image) {
            const ref = await storage.save({
              file: {
                buffer: Buffer.from(await image.arrayBuffer()),
                originalName: image.name,
                mimeType: image.type
              }
            })

            receiptKey = ref?.key ?? ''
          }
        } else {
          const ref = await storage.save({ file: rawReceipt })

          receiptKey = ref?.key ?? ''
        }
      }

      const baseTransaction = requireResult(
        (
          await db
            .insert(walletTransactions)
            .values({
              type: body.type === 'transfer' ? 'transfer' : 'income_expenses',
              amount: body.amount,
              date: body.date ? new Date(body.date) : new Date(),
              receipt: receiptKey
            })
            .returning()
        )[0],
        'Insert returned no row',
        500
      )

      if (body.type === 'transfer') {
        await db.insert(walletTransactionsTransfer).values({
          from: body.from || null,
          to: body.to || null,
          base_transaction: baseTransaction.id
        })
      } else {
        await db.insert(walletTransactionsIncomeExpenses).values({
          base_transaction: baseTransaction.id,
          type: body.type,
          ...mapIncomeExpenses(body)!
        })
      }

      const {
        created: _created,
        updated: _updated,
        ...transaction
      } = baseTransaction

      return response.created(transaction)
    }
  )

export const update = forge
  .mutation({
    description: 'Update transaction details',
    input: {
      query: z.object({ id: forge.existsIn(z.string(), walletTransactions) }),
      body: MutateTransactionInputSchema
    },
    media: {
      receipt: {
        optional: true
      }
    },
    output: {
      OK: transactionDto
    }
  })
  .callback(
    async ({
      db,
      query: { id },
      body,
      media: { receipt: rawReceipt },
      core: {
        media: { convertPDFToImage },
        storage
      },
      response
    }) => {
      let receiptUpdate: { receipt?: string } = {}

      if (rawReceipt === 'removed') {
        receiptUpdate = { receipt: '' }
      } else if (rawReceipt && typeof rawReceipt !== 'string') {
        if (rawReceipt.originalName.endsWith('.pdf')) {
          const image = await convertPDFToImage(rawReceipt.path)

          if (image) {
            const ref = await storage.save({
              file: {
                buffer: Buffer.from(await image.arrayBuffer()),
                originalName: image.name,
                mimeType: image.type
              }
            })

            receiptUpdate = { receipt: ref?.key ?? '' }
          }
        } else {
          const ref = await storage.save({ file: rawReceipt })

          receiptUpdate = { receipt: ref?.key ?? '' }
        }
      }

      const baseTransaction = requireResult(
        (
          await db
            .update(walletTransactions)
            .set({
              type: body.type === 'transfer' ? 'transfer' : 'income_expenses',
              amount: body.amount,
              date: body.date ? new Date(body.date) : new Date(),
              updated: new Date(),
              ...receiptUpdate
            })
            .where(eq(walletTransactions.id, id))
            .returning()
        )[0]
      )

      if (body.type === 'transfer') {
        await db
          .delete(walletTransactionsIncomeExpenses)
          .where(eq(walletTransactionsIncomeExpenses.base_transaction, id))

        const existingTransfer = await db.query.transactions_transfer.findFirst(
          {
            where: { base_transaction: id }
          }
        )

        if (existingTransfer) {
          await db
            .update(walletTransactionsTransfer)
            .set({ from: body.from || null, to: body.to || null })
            .where(eq(walletTransactionsTransfer.base_transaction, id))
        } else {
          await db.insert(walletTransactionsTransfer).values({
            base_transaction: id,
            from: body.from || null,
            to: body.to || null
          })
        }
      } else {
        await db
          .delete(walletTransactionsTransfer)
          .where(eq(walletTransactionsTransfer.base_transaction, id))

        const existingIncomeExpenses =
          await db.query.transactions_income_expenses.findFirst({
            where: { base_transaction: id }
          })

        if (existingIncomeExpenses) {
          await db
            .update(walletTransactionsIncomeExpenses)
            .set({ type: body.type, ...mapIncomeExpenses(body)! })
            .where(eq(walletTransactionsIncomeExpenses.base_transaction, id))
        } else {
          await db.insert(walletTransactionsIncomeExpenses).values({
            base_transaction: id,
            type: body.type,
            ...mapIncomeExpenses(body)!
          })
        }
      }

      const {
        created: _created,
        updated: _updated,
        ...transaction
      } = baseTransaction

      return response.ok(transaction)
    }
  )

export const remove = forge
  .mutation({
    description: 'Delete a transaction',
    input: {
      query: z.object({ id: forge.existsIn(z.string(), walletTransactions) })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(walletTransactions).where(eq(walletTransactions.id, id))

    return response.noContent()
  })

export const scanReceipt = forge
  .mutation({
    description: 'Extract transaction data from receipt using OCR',
    media: {
      file: {
        optional: false
      }
    },
    output: {
      OK: z.object({
        date: z.string(),
        amount: z.number().finite().nonnegative(),
        type: z.enum(['income', 'expenses']),
        category: z.string(),
        platform: z.string().nullable(),
        particulars: z.string(),
        location_coords: z.object({
          lon: z.number(),
          lat: z.number()
        }),
        location_name: z.string(),
        matchedTransactionIds: z.array(z.string())
      })
    }
  })
  .callback(
    async ({
      db,
      media: { file },
      core: {
        media: { convertPDFToImage },
        api: { fetchAI, getAPIKey, searchLocations },
        logging
      },
      response
    }) => {
      if (!file || typeof file === 'string') {
        return response.badRequest('No file uploaded')
      }

      logging.info(`Scanning receipt "${file.originalName}" (${file.mimeType})`)

      if (file.originalName.endsWith('.pdf')) {
        const image = await convertPDFToImage(file.path)

        if (!image) {
          return response.badRequest('Failed to convert PDF to image')
        }

        const buffer = await image.arrayBuffer()

        fs.writeFileSync('medium/receipt.png', Buffer.from(buffer))
      } else {
        fs.renameSync(file.path, 'medium/receipt.png')
      }

      if (!fs.existsSync('medium/receipt.png')) {
        return response.badRequest('Receipt image not found')
      }

      const base64Image = fs.readFileSync('medium/receipt.png', {
        encoding: 'base64'
      })

      const mimeType = file.originalName.endsWith('.pdf')
        ? 'image/png'
        : file.mimeType

      fs.unlinkSync('medium/receipt.png')

      return response.ok(
        await getTransactionDetails(
          `data:${mimeType};base64,${base64Image}`,
          db,
          fetchAI,
          getAPIKey,
          searchLocations,
          logging
        )
      )
    }
  )

export const createMultiple = forge
  .mutation({
    description: 'Create multiple new transactions',
    input: {
      body: z.object({
        transactions: z.array(MutateTransactionInputSchema)
      })
    },
    output: {
      CREATED: z.null()
    }
  })
  .callback(async ({ db, body: { transactions }, response }) => {
    for (const body of transactions) {
      const baseTransaction = requireResult(
        (
          await db
            .insert(walletTransactions)
            .values({
              type: body.type === 'transfer' ? 'transfer' : 'income_expenses',
              amount: body.amount,
              date: body.date ? new Date(body.date) : new Date()
            })
            .returning()
        )[0],
        'Insert returned no row',
        500
      )

      if (body.type === 'transfer') {
        await db.insert(walletTransactionsTransfer).values({
          from: body.from || null,
          to: body.to || null,
          base_transaction: baseTransaction.id
        })
      } else {
        await db.insert(walletTransactionsIncomeExpenses).values({
          base_transaction: baseTransaction.id,
          type: body.type,
          ...mapIncomeExpenses(body)!
        })
      }
    }

    return response.created(null)
  })
