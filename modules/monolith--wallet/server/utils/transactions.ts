import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { and, eq, gte, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import z from 'zod'

import type { BuiltModuleSchema } from '@monolith/drizzle'
import type {
  CoreContext,
  FetchAIFunc,
  SearchLocationsFunc
} from '@monolith/server-utils'

import type { WalletSchema } from '../endpoints'
import {
  walletCategories,
  walletPlatforms,
  walletTransactionTemplates,
  walletTransactions,
  walletTransactionsIncomeExpenses
} from '../schema.drizzle'

dayjs.extend(customParseFormat)

type WalletDb = PostgresJsDatabase<BuiltModuleSchema<WalletSchema>>

type GetAPIKeyFunc = (id: string) => Promise<string>

export async function getTransactionDetails(
  imageDataUrl: string,
  db: WalletDb,
  fetchAI: FetchAIFunc,
  getAPIKey: GetAPIKeyFunc,
  searchLocations: SearchLocationsFunc,
  logging: CoreContext['logging']
) {
  type FinalResult = {
    date: string
    type: 'income' | 'expenses'
    amount: number
    category: string
    particulars: string
    location_coords: {
      lon: number
      lat: number
    }
    location_name: string
    asset?: string
    platform: string | null
    ledgers?: string[]
    matchedTransactionIds: string[]
  }

  const [particularPrompt, categories, platforms, key] = await Promise.all([
    db.query.transactions_prompts.findFirst().catch(() => null),
    db.select().from(walletCategories),
    db
      .select()
      .from(walletPlatforms)
      .catch(() => []),
    getAPIKey('gcloud')
  ])

  const categoryMap = new Map(categories.map(c => [c.name, c.id]))

  const categoryNames = categories.map(c => c.name) as [string, ...string[]]

  const platformMap = new Map(platforms.map(p => [p.name, p.id]))

  const platformEnum =
    platforms.length > 0
      ? z.enum(['None', ...platforms.map(p => p.name)] as [string, ...string[]])
      : z.literal('None')

  const FullTransactionDetails = z.object({
    date: z
      .string()
      .describe(
        'Transaction date in DD/MM/YYYY format, never later than the current date'
      ),
    type: z.enum(['income', 'expenses']),
    category: z.enum(categoryNames),
    platform: platformEnum.describe('The purchase platform, or "None"'),
    amount: z.number().describe('Numeric amount without currency symbol'),
    location: z.string().describe('Location name or "Unknown"')
  })

  const extractedData = await fetchAI({
    provider: 'openrouter',
    model: 'inclusionai/ling-3.0-flash-vl',
    messages: [
      {
        role: 'system',
        content: `Extract transaction details from the receipt image. Return the date in DD/MM/YYYY format. The scanned date must never exceed the current date (${dayjs().format('DD/MM/YYYY')}); if the receipt shows a future date or the date cannot be determined, use the current date instead. Categories: ${categoryNames.join(', ')}. Purchase platforms: ${platforms.length > 0 ? platforms.map(p => p.name).join(', ') : 'None'}. Extract the purchase platform if explicitly present; otherwise use "None".`
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageDataUrl }
          }
        ]
      }
    ],
    structure: FullTransactionDetails
  })

  if (!extractedData) {
    throw new Error('Failed to extract transaction details')
  }

  const parsedDate = dayjs(extractedData.date, 'DD/MM/YYYY')
  const fallbackDate = dayjs(extractedData.date)

  extractedData.date = parsedDate.isValid()
    ? parsedDate.format('YYYY-MM-DD')
    : fallbackDate.isValid()
      ? fallbackDate.format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD')

  logging.info(
    `Extracted receipt details: type=${extractedData.type} amount=${extractedData.amount} date=${extractedData.date} location=${extractedData.location}`
  )

  let finalResult: FinalResult = {
    date: extractedData.date,
    type: extractedData.type,
    amount: extractedData.amount,
    category: categoryMap.get(extractedData.category) ?? '',
    platform:
      extractedData.platform !== 'None'
        ? (platformMap.get(extractedData.platform) ?? null)
        : null,
    particulars: '',
    location_coords: {
      lon: 0,
      lat: 0
    },
    location_name: '',
    matchedTransactionIds: []
  }

  const particularsPrompt = particularPrompt?.[extractedData.type]
    ? `${particularPrompt[extractedData.type]}`
    : 'Generate brief transaction description (5-10 words).'

  const templates = await db
    .select()
    .from(walletTransactionTemplates)
    .where(eq(walletTransactionTemplates.type, extractedData.type))

  if (templates.length > 0) {
    const templateNames = templates.map(t => t.name)

    const TemplateMatch = z.object({
      template: z
        .enum(['None', ...templateNames] as [string, ...string[]])
        .describe('Best matching template name or None')
    })

    const templateData = await fetchAI({
      provider: 'deepseek',
      model: 'deepseek-flash',
      messages: [
        {
          role: 'system',
          content:
            `Match transaction to template. Return the best matching template name or None if no suitable template is found.\nTemplates:\n` +
            templates
              .map(
                t =>
                  `${t.name}: ${t.particulars || 'N/A'} ${t.location_name ? `@ ${t.location_name}` : ''}`
              )
              .join('\n')
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${extractedData.amount} ${extractedData.category}`
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }
      ],
      structure: TemplateMatch
    })

    if (templateData && templateData.template !== 'None') {
      const selectedTemplate = templates.find(
        t => t.name === templateData.template
      )

      if (selectedTemplate) {
        finalResult = {
          ...finalResult,
          category: selectedTemplate.category || finalResult.category,
          asset: selectedTemplate.asset ?? '',
          platform: finalResult.platform || selectedTemplate.platform || null,
          ledgers: selectedTemplate.ledgers
        }
      }
    }

    if (!finalResult.particulars.trim()) {
      const particularsData = await fetchAI({
        provider: 'deepseek',
        model: 'deepseek-flash',
        messages: [
          { role: 'system', content: particularsPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageDataUrl }
              }
            ]
          }
        ],
        structure: z.object({ particulars: z.string() })
      })

      if (particularsData) {
        finalResult.particulars = particularsData.particulars
      }
    }
  } else {
    const particularsData = await fetchAI({
      provider: 'deepseek',
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: particularsPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }
      ],
      structure: z.object({ particulars: z.string() })
    })

    if (particularsData) {
      finalResult.particulars = particularsData.particulars
    }
  }

  if (key && extractedData.location && extractedData.location !== 'Unknown') {
    const locations = await searchLocations(key, extractedData.location)

    const firstLocation = locations[0]

    if (firstLocation) {
      finalResult.location_coords = {
        lon: firstLocation.location.longitude,
        lat: firstLocation.location.latitude
      }
      finalResult.location_name = firstLocation.name
    }
  }

  const candidates = await db
    .select({
      id: walletTransactions.id
    })
    .from(walletTransactions)
    .innerJoin(
      walletTransactionsIncomeExpenses,
      eq(
        walletTransactionsIncomeExpenses.base_transaction,
        walletTransactions.id
      )
    )
    .where(
      and(
        gte(
          walletTransactions.date,
          dayjs(finalResult.date).startOf('day').toDate()
        ),
        lte(
          walletTransactions.date,
          dayjs(finalResult.date).endOf('day').toDate()
        ),
        eq(walletTransactions.amount, finalResult.amount),
        eq(walletTransactionsIncomeExpenses.type, finalResult.type)
      )
    )

  finalResult.matchedTransactionIds = candidates.map(c => c.id)

  logging.info(
    `Found ${candidates.length} existing transaction(s) on ${finalResult.date} with amount ${finalResult.amount} and type ${finalResult.type}`
  )

  return finalResult
}
