import dayjs from 'dayjs'
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import puppeteer from 'puppeteer-core'
import z from 'zod'

import { defineRoutes, writeContractFileToClient } from '@monolith/server-utils'

import endpoints from './endpoints'
import { dailyEntries } from './schema.drizzle'
import getReadmeHTML from './utils/readme'
import { default as _getStatistics } from './utils/statistics'

const dailyEntryDto = z.object({
  date: z.string(),
  relative_files: z.record(z.string(), z.number()),
  projects: z.record(z.string(), z.number()),
  languages: z.record(z.string(), z.number()),
  hourly: z.record(z.string(), z.number()),
  total_minutes: z.number(),
  last_timestamp: z.number()
})

const getActivities = endpoints
  .query({
    description: 'Get coding activity calendar by year',
    input: {
      query: z.object({
        year: z.string().optional()
      })
    },
    output: {
      OK: z.object({
        data: z.array(
          z.object({
            date: z.string(),
            count: z.number(),
            level: z.number()
          })
        ),
        firstYear: z.number()
      })
    }
  })
  .callback(async ({ db, query: { year }, response }) => {
    const yearValue = year ? parseInt(year, 10) : new Date().getFullYear()

    const data = await db
      .select()
      .from(dailyEntries)
      .where(
        and(
          gte(dailyEntries.date, `${yearValue}-01-01`),
          lte(dailyEntries.date, `${yearValue}-12-31`)
        )
      )
      .orderBy(asc(dailyEntries.date))

    if (data.length === 0) {
      return response.ok({ data: [], firstYear: yearValue })
    }

    const groupByDate = data.reduce(
      (acc, item) => {
        acc[item.date] = item.total_minutes

        return acc
      },
      {} as { [key: string]: number }
    )

    const final = Object.entries(groupByDate).map(([date, totalMinutes]) => ({
      date,
      count: totalMinutes,
      level: (() => {
        const hours = totalMinutes / 60

        const levels = [1, 3, 5, 7, 9]

        return levels.findIndex(threshold => hours < threshold) + 1 || 6
      })()
    }))

    if (final[0] && final[0].date !== `${yearValue}-01-01`) {
      final.unshift({
        date: `${yearValue}-01-01`,
        count: 0,
        level: 0
      })
    }

    if (final.length > 0 && final.at(-1)?.date !== `${yearValue}-12-31`) {
      final.push({
        date: `${yearValue}-12-31`,
        count: 0,
        level: 0
      })
    }

    const [firstRecord] = await db
      .select({ date: dailyEntries.date })
      .from(dailyEntries)
      .orderBy(asc(dailyEntries.date))
      .limit(1)

    return response.ok({
      data: final,
      firstYear: firstRecord ? Number(firstRecord.date.slice(0, 4)) : yearValue
    })
  })

const getStatistics = endpoints
  .query({
    description: 'Get overall coding statistics',
    output: {
      OK: z.record(z.string(), z.number())
    }
  })
  .callback(async ({ db, response }) => response.ok(await _getStatistics(db)))

const getLastXDays = endpoints
  .query({
    description: 'Get coding data for last X days',
    input: {
      query: z.object({
        days: z.string()
      })
    },
    output: {
      OK: z.array(dailyEntryDto)
    }
  })
  .callback(async ({ db, query: { days }, response }) => {
    const parsedDays = parseInt(days, 10)

    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 30) {
      return response.badRequest('days must be an integer between 1 and 30')
    }

    const lastXDays = dayjs().subtract(parsedDays, 'days').format('YYYY-MM-DD')

    const data = await db
      .select()
      .from(dailyEntries)
      .where(gte(dailyEntries.date, lastXDays))

    return response.ok(data)
  })

const getTopProjects = endpoints
  .query({
    description: 'Get top projects by time spent',
    input: {
      query: z.object({
        last: z.enum(['24 hours', '7 days', '30 days']).default('7 days')
      })
    },
    output: {
      OK: z.record(z.string(), z.number())
    }
  })
  .callback(async ({ db, query: { last }, response }) => {
    const params = {
      '24 hours': [24, 'hours'],
      '7 days': [7, 'days'],
      '30 days': [30, 'days']
    }[last]

    const date = dayjs()
      .subtract(Number(params[0]), params[1] as dayjs.ManipulateType)
      .format('YYYY-MM-DD')

    const data = await db
      .select({ projects: dailyEntries.projects })
      .from(dailyEntries)
      .where(gte(dailyEntries.date, date))

    const projects = data.map(item => item.projects)

    let groupByProject: { [key: string]: number } = {}

    for (const item of projects) {
      for (const [project, minutes] of Object.entries(item)) {
        groupByProject[project] = (groupByProject[project] ?? 0) + minutes
      }
    }

    groupByProject = Object.fromEntries(
      Object.entries(groupByProject).sort(([, a], [, b]) => b - a)
    )

    return response.ok(groupByProject)
  })

const getTopLanguages = endpoints
  .query({
    description: 'Get top languages by usage',
    input: {
      query: z.object({
        last: z.enum(['24 hours', '7 days', '30 days']).default('7 days')
      })
    },
    output: {
      OK: z.record(z.string(), z.number())
    }
  })
  .callback(async ({ db, query: { last }, response }) => {
    const params = {
      '24 hours': [24, 'hours'],
      '7 days': [7, 'days'],
      '30 days': [30, 'days']
    }[last]

    const date = dayjs()
      .subtract(Number(params[0]), params[1] as dayjs.ManipulateType)
      .format('YYYY-MM-DD')

    const data = await db
      .select({ languages: dailyEntries.languages })
      .from(dailyEntries)
      .where(gte(dailyEntries.date, date))

    const languages = data.map(item => item.languages)

    let groupByLanguage: { [key: string]: number } = {}

    for (const item of languages) {
      for (const [language, minutes] of Object.entries(item)) {
        groupByLanguage[language] = (groupByLanguage[language] ?? 0) + minutes
      }
    }

    groupByLanguage = Object.fromEntries(
      Object.entries(groupByLanguage).sort(([, a], [, b]) => b - a)
    )

    return response.ok(groupByLanguage)
  })

const getEachDay = endpoints
  .query({
    description: 'Get daily coding time breakdown',
    output: {
      OK: z.array(
        z.object({
          date: z.string(),
          duration: z.number()
        })
      )
    }
  })
  .callback(async ({ db, response }) => {
    const lastDay = dayjs().format('YYYY-MM-DD')

    const firstDay = dayjs().subtract(30, 'days').format('YYYY-MM-DD')

    const data = await db
      .select()
      .from(dailyEntries)
      .where(
        and(gte(dailyEntries.date, firstDay), lte(dailyEntries.date, lastDay))
      )
      .orderBy(asc(dailyEntries.date))

    const groupByDate: { [key: string]: number } = {}

    for (const item of data) {
      groupByDate[item.date] = item.total_minutes
    }

    return response.ok(
      Object.entries(groupByDate).map(([date, item]) => ({
        date,
        duration: item * 1000 * 60
      }))
    )
  })

const getTimeDistribution = endpoints
  .query({
    description: 'Get hourly coding time distribution',
    output: {
      OK: z.record(z.string(), z.number())
    }
  })
  .callback(async ({ db, response }) => {
    const data = await db.select().from(dailyEntries)

    const hourlyData = data.map(item => item.hourly)

    const distribution: { [key: string]: number } = Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [i.toString(), 0])
    )

    for (const item of hourlyData) {
      for (const [hour, minutes] of Object.entries(item)) {
        distribution[hour] = (distribution[hour] ?? 0) + minutes
      }
    }

    return response.ok(distribution)
  })

const getUserMinutes = endpoints
  .query({
    description: 'Get total coding minutes',
    encrypted: false,
    input: {
      query: z.object({
        minutes: z.string()
      })
    },
    output: {
      OK: z.object({
        minutes: z.number()
      })
    }
  })
  .callback(async ({ db, query: { minutes }, response }) => {
    const parsedMinutes = parseInt(minutes, 10)

    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 1) {
      return response.badRequest('minutes must be a positive integer')
    }

    const minTime = dayjs()
      .subtract(parsedMinutes, 'minutes')
      .format('YYYY-MM-DD')

    const items = await db
      .select({ total_minutes: dailyEntries.total_minutes })
      .from(dailyEntries)
      .where(gte(dailyEntries.date, minTime))

    return response.ok({
      minutes: items.reduce((acc, item) => acc + item.total_minutes, 0)
    })
  })

const eventLog = endpoints
  .mutation({
    description: 'Record a coding activity event',
    encrypted: false,
    input: {
      body: z.object({
        project: z.string().trim().min(1).max(500),
        relativeFile: z.string().trim().min(1).max(2000),
        language: z.string().trim().min(1).max(100)
      })
    },
    output: {
      OK: z.object({
        status: z.string(),
        message: z.string()
      })
    }
  })
  .callback(async ({ db, body: data, response }) => {
    const eventTime = Math.floor(Date.now() / 60000) * 60000

    const date = dayjs(eventTime).format('YYYY-MM-DD')

    // Serialize concurrent editor heartbeats for this user's day inside the request transaction.
    await db.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(current_setting('zillion.user_id') || ${date}, 0))`
    )

    const lastRecord = await db.query.daily_entries.findFirst({
      where: { date }
    })

    const project = data.project

    const relativeFile = data.relativeFile

    const language = data.language

    const hourKey = dayjs(eventTime).format('H')

    if (!lastRecord) {
      await db.insert(dailyEntries).values({
        date,
        projects: { [project]: 1 },
        relative_files: { [relativeFile]: 1 },
        languages: { [language]: 1 },
        hourly: { [hourKey]: 1 },
        total_minutes: 1,
        last_timestamp: eventTime
      })
    } else {
      if (eventTime === lastRecord.last_timestamp) {
        return response.ok({ status: 'ok', message: 'success' })
      }

      const projects = { ...lastRecord.projects }

      projects[project] = (projects[project] ?? 0) + 1

      const relativeFiles = { ...lastRecord.relative_files }

      relativeFiles[relativeFile] = (relativeFiles[relativeFile] ?? 0) + 1

      const languages = { ...lastRecord.languages }

      languages[language] = (languages[language] ?? 0) + 1

      const hourly = { ...lastRecord.hourly }

      hourly[hourKey] = (hourly[hourKey] ?? 0) + 1

      await db
        .update(dailyEntries)
        .set({
          projects,
          relative_files: relativeFiles,
          languages,
          hourly,
          total_minutes: lastRecord.total_minutes + 1,
          last_timestamp: eventTime,
          updated: new Date()
        })
        .where(eq(dailyEntries.id, lastRecord.id))
    }

    return response.ok({ status: 'ok', message: 'success' })
  })

const readme = endpoints
  .query({
    description: 'Generate README stats image',
    encrypted: false,
    output: 'custom'
  })
  .callback(async ({ db, res }) => {
    const html = await getReadmeHTML(db)

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    await page.setViewport({
      width: 1080,
      height: 430
    })
    await page.setContent(html)
    await page.evaluate(async () => {
      await document.fonts.ready
    })

    const imageBuffer = await page.screenshot({ type: 'png' })

    await browser.close()

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.set('Content-Type', 'image/png')

    res.status(200).send(imageBuffer)
  })

const routes = defineRoutes({
  getActivities,
  getStatistics,
  getLastXDays,
  getTopProjects,
  getTopLanguages,
  getEachDay,
  getTimeDistribution,
  user: {
    minutes: getUserMinutes
  },
  eventLog,
  readme
})

writeContractFileToClient(routes, import.meta.dirname)

export default routes
