import { asc, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import ical from 'node-ical'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import { ICalSyncService } from '../functions/icalSyncing'
import { calendars } from '../schema.drizzle'

const calendarDto = createSelectSchema(calendars)

export const list = forge
  .query({
    description: 'Get all calendars',
    output: {
      OK: z.array(calendarDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select()
      .from(calendars)
      .orderBy(asc(calendars.link), asc(calendars.name))

    return response.ok(rows)
  })

export const getById = forge
  .query({
    description: 'Get a specific calendar by ID',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), calendars)
      })
    },
    output: {
      OK: calendarDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const row = requireResult(
      await db.query.calendars.findFirst({ where: { id } })
    )

    return response.ok(row)
  })

export const create = forge
  .mutation({
    description: 'Create a new calendar with optional ICS sync',
    input: {
      body: calendarDto
        .pick({
          name: true,
          color: true
        })
        .extend({
          icsUrl: z.url().optional()
        })
    },
    output: {
      CREATED: calendarDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const newCalendar = requireResult(
      (
        await db
          .insert(calendars)
          .values({
            name: body.name,
            color: body.color,
            link: body.icsUrl ?? ''
          })
          .returning()
      )[0],
      'Insert returned no row',
      500
    )

    if (body.icsUrl) {
      const icalService = new ICalSyncService(db)

      await icalService
        .syncCalendar(newCalendar.id, body.icsUrl)
        .catch(console.error)
    }

    return response.created(newCalendar)
  })

export const update = forge
  .mutation({
    description: 'Update calendar name and color',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), calendars)
      }),
      body: calendarDto.pick({
        name: true,
        color: true
      })
    },
    output: {
      OK: calendarDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(calendars)
          .set(body)
          .where(eq(calendars.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = forge
  .mutation({
    description: 'Delete a calendar',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), calendars)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(calendars).where(eq(calendars.id, id))

    return response.noContent()
  })

export const validateICS = forge
  .mutation({
    description: 'Validate if an ICS URL is accessible',
    input: {
      body: z.object({
        icsUrl: z.url()
      })
    },
    output: {
      OK: z.boolean()
    }
  })
  .callback(async ({ body: { icsUrl }, response }) => {
    try {
      const res = await fetch(icsUrl)

      if (!res.ok) {
        return response.ok(false)
      }

      const text = await res.text()

      const parsed = ical.sync.parseICS(text)

      if (Object.keys(parsed).length === 0) {
        return response.ok(false)
      }

      return response.ok(true)
    } catch {
      return response.ok(false)
    }
  })
