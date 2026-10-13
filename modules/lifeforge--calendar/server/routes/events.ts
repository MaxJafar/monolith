import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import fs from 'fs'
import z from 'zod'

import {
  ClientError,
  LocationSchema,
  requireResult
} from '@lifeforge/server-utils'

import forge from '../forge'
import {
  isOffsetInstant,
  parseDuration,
  parseEventRange
} from '../functions/eventValidation'
import getEvents from '../functions/getEvents'
import {
  calendars,
  categories,
  events,
  eventsRecurring,
  eventsSingle
} from '../schema.drizzle'

dayjs.extend(utc)

const eventDto = createSelectSchema(events).extend({
  category: z.string(),
  calendar: z.string(),
  location_coords: z.object({ lat: z.number(), lon: z.number() })
})

const eventSingleDto = createSelectSchema(eventsSingle).extend({
  start: z.string(),
  end: z.string()
})

function serializeEvent(row: typeof events.$inferSelect) {
  return {
    ...row,
    category: row.category ?? '',
    calendar: row.calendar ?? '',
    location_coords: row.location_coords ?? { lat: 0, lon: 0 }
  }
}

const CreateAndUpdateEventSchema = eventDto
  .omit({
    type: true,
    location: true,
    location_coords: true,
    created: true,
    updated: true,
    calendar: true,
    id: true
  })
  .extend({
    category: z.union([
      forge.existsIn(z.string().uuid(), categories),
      z.literal('')
    ]),
    calendar: z
      .union([forge.existsIn(z.string().uuid(), calendars), z.literal('')])
      .optional(),
    location: LocationSchema.optional()
  })
  .and(
    z.union([
      z.object({ type: z.literal('single') }).and(
        eventSingleDto.omit({
          base_event: true,
          id: true
        })
      ),
      z.object({
        type: z.literal('recurring'),
        rrule: z.string()
      })
    ])
  )

const AggregatedEventDto = z.object({
  id: z.string(),
  type: z.enum(['single', 'recurring']),
  start: z.string(),
  end: z.string(),
  rrule: z.string().optional(),
  title: z.string(),
  calendar: z.string(),
  category: z.string(),
  description: z.string(),
  location: z.string(),
  location_coords: z.object({
    lat: z.number(),
    lon: z.number()
  }),
  reference_link: z.string(),
  is_strikethrough: z.boolean().optional(),
  updated: z.string().optional()
})

export const getByDateRange = forge
  .query({
    description: 'Get events within a date range',
    input: {
      query: z
        .object({
          start: z.string(),
          end: z.string()
        })
        .superRefine((value, ctx) => {
          try {
            parseEventRange(value.start, value.end)
          } catch (error) {
            ctx.addIssue({
              code: 'custom',
              message:
                error instanceof Error
                  ? error.message
                  : 'Invalid calendar range'
            })
          }
        })
    },
    output: {
      OK: z.array(AggregatedEventDto)
    }
  })
  .callback(
    async ({ db, query: { start, end }, core: { logging }, response }) =>
      response.ok(await getEvents({ db, start, end, logging }))
  )

export const getToday = forge
  .query({
    description: "Get today's events",
    output: {
      OK: z.array(
        eventDto.omit({ created: true, updated: true }).extend({
          start: z.string(),
          end: z.string()
        })
      )
    }
  })
  .callback(async ({ db, core: { logging }, response }) => {
    const day = dayjs().format('YYYY-MM-DD')

    const startMoment = dayjs(day).startOf('day').toISOString()

    const endMoment = dayjs(day).endOf('day').toISOString()

    return response.ok(
      await getEvents({ db, start: startMoment, end: endMoment, logging })
    )
  })

export const getById = forge
  .query({
    description: 'Get a specific event by ID',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), events)
      })
    },
    output: {
      OK: eventDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const row = requireResult(
      await db.query.events.findFirst({ where: { id } })
    )

    return response.ok(serializeEvent(row))
  })

export const create = forge
  .mutation({
    description: 'Create a new event',
    input: {
      body: CreateAndUpdateEventSchema
    },
    output: {
      CREATED: eventDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const eventData = body

    if (eventData.type === 'recurring') {
      const validation = parseDuration(eventData.rrule)

      if ('error' in validation) return response.badRequest(validation.error)
    } else if (
      !dayjs(eventData.start).isValid() ||
      !dayjs(eventData.end).isValid() ||
      dayjs(eventData.end).isBefore(eventData.start)
    ) {
      return response.badRequest(
        'Event end must be on or after a valid start date'
      )
    }

    const baseEvent = requireResult(
      (
        await db
          .insert(events)
          .values({
            title: eventData.title,
            category: eventData.category || null,
            calendar: eventData.calendar || null,
            location: eventData.location?.name || '',
            location_coords: {
              lat: eventData.location?.location.latitude || 0,
              lon: eventData.location?.location.longitude || 0
            },
            reference_link: eventData.reference_link || '',
            description: eventData.description || '',
            type: eventData.type
          })
          .returning()
      )[0],
      'Insert returned no row',
      500
    )

    if (eventData.type === 'recurring') {
      const parsed = parseDuration(eventData.rrule)

      if ('error' in parsed) {
        return response.badRequest(parsed.error)
      }

      await db.insert(eventsRecurring).values({
        base_event: baseEvent.id,
        recurring_rule: parsed.rule,
        duration_amount: parsed.amount,
        duration_unit: parsed.unit,
        exceptions: []
      })
    } else {
      if (!('start' in eventData) || !('end' in eventData)) {
        return response.badRequest(
          'Single events must have start and end times'
        )
      }

      await db.insert(eventsSingle).values({
        base_event: baseEvent.id,
        start: dayjs(eventData.start).utc().toDate(),
        end: dayjs(eventData.end).utc().toDate()
      })
    }

    return response.created(serializeEvent(baseEvent))
  })

export const scanImage = forge
  .mutation({
    description: 'Extract event details from image using AI',
    media: {
      file: {
        optional: false,
        multiple: false
      }
    },
    output: {
      OK: z.object({
        title: z.string(),
        start: z.string(),
        end: z.string(),
        location: z.string(),
        location_coords: z.object({ lat: z.number(), lon: z.number() }),
        description: z.string(),
        category: z.string()
      })
    }
  })
  .callback(
    async ({
      db,
      media: { file },
      core: {
        api: { fetchAI, getAPIKey, searchLocations }
      },
      response
    }) => {
      if (!file || typeof file === 'string') {
        return response.badRequest('No file uploaded')
      }

      const gcloudKey = await getAPIKey('gcloud')

      const allCategories = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)

      const categoryList = allCategories.map(category => category.name)

      const responseStructure = z.object({
        title: z.string(),
        start: z.string(),
        end: z.string(),
        location: z.string().nullable(),
        description: z.string().nullable(),
        category: z.string().nullable()
      })

      const base64Image = fs.readFileSync(file.path, {
        encoding: 'base64'
      })

      const aiResponse = await fetchAI({
        provider: 'openai',
        model: 'gpt-5.4-mini',
        structure: responseStructure,
        messages: [
          {
            role: 'system',
            content: `You are a calendar assistant. Extract the event details from the image. If no event can be extracted, respond with null. Assume that today is ${dayjs().format(
              'YYYY-MM-DD'
            )} unless specified otherwise. 

          The title should be the name of the event.

          The dates should be in the format of YYYY-MM-DD HH:mm:ss
          
          Parse the description (event details) from the image and express it in the form of markdown. If there are multiple lines of description seen in the image, try not to squeeze everything into a single paragraph. If possible, break the details into multiple sections, with each section having a h3 heading. For example:

          ### Section Title:
          Section details here.

          ### Another Section Title:
          Another section details here.
          
          The categories should be one of the following (case sensitive): ${categoryList.join(
            ', '
          )}. Try to pick the most relevant category instead of just picking the most general one, unless you're really not sure`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.mimeType};base64,${base64Image}`,
                  detail: 'auto'
                }
              }
            ]
          }
        ]
      })

      if (!aiResponse) {
        return response.badRequest('Failed to scan image')
      }

      const finalResponse = {
        title: aiResponse.title,
        start: aiResponse.start,
        end: aiResponse.end,
        location: aiResponse.location || '',
        location_coords: { lat: 0, lon: 0 },
        description: aiResponse.description || '',
        category:
          allCategories.find(category => category.name === aiResponse.category)
            ?.id || ''
      }

      if (finalResponse.location && gcloudKey) {
        const locationInGoogleMap = await searchLocations(
          gcloudKey,
          finalResponse.location
        )

        const firstLocation = locationInGoogleMap[0]

        if (firstLocation) {
          finalResponse.location = firstLocation.name
          finalResponse.location_coords = {
            lat: firstLocation.location.latitude,
            lon: firstLocation.location.longitude
          }
        }
      }

      return response.ok(finalResponse)
    }
  )

export const addException = forge
  .mutation({
    description: 'Add exception date to recurring event',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), events),
        date: z
          .string()
          .refine(
            value => dayjs.utc(value).isValid(),
            'Invalid occurrence date'
          )
      })
    },
    output: {
      OK: z.boolean()
    }
  })
  .callback(async ({ db, query: { id, date }, response }) => {
    const [event] = await db
      .select()
      .from(eventsRecurring)
      .where(eq(eventsRecurring.base_event, id))
      .limit(1)
      .for('update')

    if (!event) {
      return response.ok(false)
    }

    const exceptions = event.exceptions
    const occurrence = dayjs.utc(date)

    if (exceptions.some(exception => dayjs.utc(exception).isSame(occurrence))) {
      return response.ok(false)
    }

    exceptions.push(occurrence.toISOString())

    await db
      .update(eventsRecurring)
      .set({ exceptions })
      .where(eq(eventsRecurring.id, event.id))

    return response.ok(true)
  })

export const update = forge
  .mutation({
    description: 'Update event details',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), events)
      }),
      body: CreateAndUpdateEventSchema.and(
        z.object({
          expected_updated: z.string().refine(isOffsetInstant).optional()
        })
      )
    },
    output: {
      OK: eventDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const eventData = body

    if (eventData.type === 'recurring') {
      const validation = parseDuration(eventData.rrule)

      if ('error' in validation) return response.badRequest(validation.error)
    } else if (
      !dayjs(eventData.start).isValid() ||
      !dayjs(eventData.end).isValid() ||
      dayjs(eventData.end).isBefore(eventData.start)
    ) {
      return response.badRequest(
        'Event end must be on or after a valid start date'
      )
    }

    const current = requireResult(
      (
        await db
          .select()
          .from(events)
          .where(eq(events.id, id))
          .limit(1)
          .for('update')
      )[0]
    )

    if (
      eventData.expected_updated &&
      new Date(eventData.expected_updated).getTime() !==
        current.updated.getTime()
    )
      throw new ClientError(
        'This event changed while the editor was open. Reopen it to load the latest details.',
        409
      )

    const location = eventData.location

    await db
      .update(events)
      .set({
        title: eventData.title,
        type: eventData.type,
        category: eventData.category || null,
        calendar: eventData.calendar || null,
        reference_link: eventData.reference_link || '',
        description: eventData.description || '',
        updated: new Date(Math.max(Date.now(), current.updated.getTime() + 1)),
        ...(typeof location === 'object'
          ? {
              location: location.name,
              location_coords: {
                lat: location.location.latitude,
                lon: location.location.longitude
              }
            }
          : {})
      })
      .where(eq(events.id, id))

    if (eventData.type === 'recurring') {
      const parsed = parseDuration(eventData.rrule)

      if ('error' in parsed) {
        return response.badRequest(parsed.error)
      }

      await db.delete(eventsSingle).where(eq(eventsSingle.base_event, id))

      const subEvent = await db.query.eventsRecurring.findFirst({
        where: { base_event: id }
      })

      if (subEvent) {
        await db
          .update(eventsRecurring)
          .set({
            recurring_rule: parsed.rule,
            duration_amount: parsed.amount,
            duration_unit: parsed.unit
          })
          .where(eq(eventsRecurring.id, subEvent.id))
      } else {
        await db.insert(eventsRecurring).values({
          base_event: id,
          recurring_rule: parsed.rule,
          duration_amount: parsed.amount,
          duration_unit: parsed.unit,
          exceptions: []
        })
      }
    } else {
      if (!('start' in eventData) || !('end' in eventData)) {
        return response.badRequest(
          'Single events must have start and end times'
        )
      }

      await db.delete(eventsRecurring).where(eq(eventsRecurring.base_event, id))

      const subEvent = await db.query.eventsSingle.findFirst({
        where: { base_event: id }
      })

      if (subEvent) {
        await db
          .update(eventsSingle)
          .set({
            start: dayjs(eventData.start).utc().toDate(),
            end: dayjs(eventData.end).utc().toDate()
          })
          .where(eq(eventsSingle.id, subEvent.id))
      } else {
        await db.insert(eventsSingle).values({
          base_event: id,
          start: dayjs(eventData.start).utc().toDate(),
          end: dayjs(eventData.end).utc().toDate()
        })
      }
    }

    const row = requireResult(
      await db.query.events.findFirst({ where: { id } })
    )

    return response.ok(serializeEvent(row))
  })

export const reschedule = forge
  .mutation({
    description: 'Change only the dates of an owned single event',
    input: {
      query: z.object({ id: forge.existsIn(z.uuid(), events) }),
      body: z
        .object({
          start: z
            .string()
            .refine(isOffsetInstant, 'Provide an ISO timestamp with an offset'),
          end: z
            .string()
            .refine(isOffsetInstant, 'Provide an ISO timestamp with an offset')
        })
        .refine(
          value => new Date(value.end) >= new Date(value.start),
          'Event end must be on or after start'
        )
    },
    output: { OK: z.boolean() }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const event = requireResult(
      (
        await db
          .select()
          .from(events)
          .where(eq(events.id, id))
          .limit(1)
          .for('update')
      )[0]
    )

    if (event.type !== 'single')
      return response.badRequest('Only native single events can be rescheduled')

    const subtype = requireResult(
      await db.query.eventsSingle.findFirst({ where: { base_event: id } })
    )
    await db
      .update(eventsSingle)
      .set({ start: new Date(body.start), end: new Date(body.end) })
      .where(eq(eventsSingle.id, subtype.id))
    await db
      .update(events)
      .set({
        updated: new Date(Math.max(Date.now(), event.updated.getTime() + 1))
      })
      .where(eq(events.id, id))

    return response.ok(true)
  })

export const remove = forge
  .mutation({
    description: 'Delete an event',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), events)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(events).where(eq(events.id, id))

    return response.noContent()
  })
