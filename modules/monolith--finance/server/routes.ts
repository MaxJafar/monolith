import z from 'zod'

import { todayCivil } from '../core/periods'
import {
  accountSaveSchema,
  categorySaveSchema,
  deleteInputSchema,
  purchaseInputSchema,
  rateBookSchema,
  rateRefreshSchema,
  rateSaveSchema,
  recurringPostResultSchema,
  recurringPostSchema,
  recurringSaveSchema,
  settingsSaveSchema,
  settingsSchema,
  setupInputSchema,
  snapshotSchema,
  summaryInputSchema,
  summarySchema,
  taxRuleSaveSchema,
  transactionListInputSchema,
  transactionListSchema,
  transactionSaveSchema,
  wishlistItemSaveSchema,
  wishlistListSaveSchema
} from '../core/schemas'
import endpoints from './endpoints'
import { ownerId } from './model'
import {
  applySetup,
  deleteAccount,
  deleteCategory,
  deleteList,
  deleteRecurring,
  deleteTaxRule,
  deleteTransaction,
  deleteWish,
  getSnapshot,
  getSummary,
  listTransactions,
  postRecurring,
  purchaseWish,
  refreshRates,
  saveAccount,
  saveCategory,
  saveList,
  saveRate,
  saveRecurring,
  saveSettings,
  saveTaxRule,
  saveTransaction,
  saveWish
} from './store'

const savedSchema = z.object({ id: z.string().uuid(), updated: z.string() })

export const snapshot = endpoints
  .query({
    description:
      'Read your accounts with balances, categories, tax rules, wishlist, plan and exchange rates',
    output: { OK: snapshotSchema }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(await getSnapshot(db, ownerId(res)))
  )

export const summary = endpoints
  .query({
    description:
      'Read exact income, spending, tax and net worth totals for a period, bucketed for a timeline',
    input: { query: summaryInputSchema },
    output: { OK: summarySchema }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(await getSummary(db, ownerId(res), query))
  )

const transactionList = endpoints
  .query({
    description: 'List your transactions between two dates, newest first',
    input: { query: transactionListInputSchema },
    output: { OK: transactionListSchema }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(await listTransactions(db, ownerId(res), query))
  )
const transactionSave = endpoints
  .mutation({
    description:
      'Record or edit income, spending or a transfer; taxes and conversions are calculated on the server',
    input: { body: transactionSaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveTransaction(db, ownerId(res), body))
  )
const transactionDelete = endpoints
  .mutation({
    description:
      'Delete a transaction; a wishlist purchase returns to the wishlist',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteTransaction(db, ownerId(res), body)

    return response.noContent()
  })

export const transactions = {
  list: transactionList,
  save: transactionSave,
  delete: transactionDelete
}

const accountSave = endpoints
  .mutation({
    description:
      'Create or update a bank, card, cash, crypto, savings or debt account',
    input: { body: accountSaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveAccount(db, ownerId(res), body))
  )
const accountDelete = endpoints
  .mutation({
    description: 'Delete an account that has no transactions',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteAccount(db, ownerId(res), body)

    return response.noContent()
  })

export const accounts = { save: accountSave, delete: accountDelete }

const categorySave = endpoints
  .mutation({
    description: 'Create, rename or move an expense category or income stream',
    input: { body: categorySaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveCategory(db, ownerId(res), body))
  )
const categoryDelete = endpoints
  .mutation({
    description: 'Delete a category; its transactions become uncategorized',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteCategory(db, ownerId(res), body)

    return response.noContent()
  })

export const categories = { save: categorySave, delete: categoryDelete }

const taxRuleSave = endpoints
  .mutation({
    description: 'Create or update a VAT rule or an income tax schedule',
    input: { body: taxRuleSaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveTaxRule(db, ownerId(res), body))
  )
const taxRuleDelete = endpoints
  .mutation({
    description: 'Delete a tax rule; booked transactions keep their tax',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteTaxRule(db, ownerId(res), body)

    return response.noContent()
  })

export const taxRules = { save: taxRuleSave, delete: taxRuleDelete }

const listSave = endpoints
  .mutation({
    description: 'Create or rename a wishlist',
    input: { body: wishlistListSaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveList(db, ownerId(res), body))
  )
const listDelete = endpoints
  .mutation({
    description: 'Delete a wishlist and keep its items unsorted',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteList(db, ownerId(res), body)

    return response.noContent()
  })
const wishSave = endpoints
  .mutation({
    description: 'Create or update a wishlist item and its price',
    input: { body: wishlistItemSaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveWish(db, ownerId(res), body))
  )
const wishDelete = endpoints
  .mutation({
    description:
      'Delete a wishlist item; a booked purchase stays in your spending',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteWish(db, ownerId(res), body)

    return response.noContent()
  })
const wishPurchase = endpoints
  .mutation({
    description:
      'Move a wishlist item into your spending at its calculated total, or move it back',
    input: { body: purchaseInputSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await purchaseWish(db, ownerId(res), body, todayCivil()))
  )

export const wishlist = {
  saveList: listSave,
  deleteList: listDelete,
  save: wishSave,
  delete: wishDelete,
  purchase: wishPurchase
}

const recurringSave = endpoints
  .mutation({
    description: 'Create or update a recurring income, bill or subscription',
    input: { body: recurringSaveSchema },
    output: { OK: savedSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveRecurring(db, ownerId(res), body))
  )
const recurringDelete = endpoints
  .mutation({
    description: 'Delete a planned item; transactions it posted stay',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteRecurring(db, ownerId(res), body)

    return response.noContent()
  })
const recurringPost = endpoints
  .mutation({
    description: 'Book due occurrences of planned items exactly once',
    input: { body: recurringPostSchema },
    output: { OK: recurringPostResultSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await postRecurring(db, ownerId(res), body))
  )

export const plan = {
  save: recurringSave,
  delete: recurringDelete,
  post: recurringPost
}

const rateRefresh = endpoints
  .mutation({
    description: 'Fetch market exchange rates for the currencies you use',
    output: { OK: rateRefreshSchema }
  })
  .callback(async ({ db, res, response, core: { api } }) => {
    let key = ''

    try {
      key = await api.getAPIKey('coingecko')
    } catch {
      /* The public endpoint serves the common coins without a key. */
    }

    return response.ok(await refreshRates(db, ownerId(res), key))
  })
const rateSave = endpoints
  .mutation({
    description: 'Pin your own exchange rate for a currency, or clear it',
    input: { body: rateSaveSchema },
    output: { OK: rateBookSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveRate(db, ownerId(res), body))
  )

export const rates = { refresh: rateRefresh, save: rateSave }

const settingsSave = endpoints
  .mutation({
    description: 'Save your main and display currencies and preferences',
    input: { body: settingsSaveSchema },
    output: { OK: settingsSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveSettings(db, ownerId(res), body))
  )

export const settings = { save: settingsSave }

const setupApply = endpoints
  .mutation({
    description:
      'Create your starting accounts, categories, tax rules and wishlists',
    input: { body: setupInputSchema },
    output: { OK: snapshotSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await applySetup(db, ownerId(res), body))
  )

export const setup = { apply: setupApply }
