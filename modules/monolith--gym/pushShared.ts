import z from 'zod'

export const pushPreferencesSchema = z
  .object({
    planned: z.boolean().default(true),
    rest: z.boolean().default(true),
    coach: z.boolean().default(true)
  })
  .strict()

export const pushLanguageSchema = z.enum(['en', 'ms', 'zh-CN', 'zh-TW'])

export const pushSubscriptionInputSchema = z
  .object({
    subscription: z
      .object({
        endpoint: z.url().max(2048),
        expirationTime: z.number().finite().positive().nullable().optional(),
        keys: z
          .object({
            p256dh: z.string().min(80).max(100),
            auth: z.string().min(20).max(30)
          })
          .strict()
      })
      .strict(),
    device_name: z.string().trim().min(1).max(100).default('Browser'),
    language: pushLanguageSchema.default('en'),
    preferences: pushPreferencesSchema.default({
      planned: true,
      rest: true,
      coach: true
    })
  })
  .strict()

export const pushSubscriptionSchema = z.object({
  id: z.uuid(),
  endpoint_hash: z.string().regex(/^[a-f0-9]{64}$/),
  device_name: z.string(),
  language: pushLanguageSchema,
  preferences: pushPreferencesSchema,
  created: z.string(),
  last_success: z.string().nullable(),
  last_error: z.string().nullable()
})

export const pushStatusSchema = z.object({
  owner_id: z.uuid(),
  configured: z.boolean(),
  public_key: z.string().nullable(),
  subscriptions: z.array(pushSubscriptionSchema)
})

export const pushPayloadSchema = z
  .object({
    owner_id: z.uuid(),
    title: z.string().min(1).max(160),
    body: z.string().max(500),
    tag: z.string().min(1).max(200),
    url: z.enum([
      '/gym?section=dashboard',
      '/gym?section=workout',
      '/gym?section=coach'
    ])
  })
  .strict()

export type PushPreferences = z.infer<typeof pushPreferencesSchema>

export type PushLanguage = z.infer<typeof pushLanguageSchema>

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>

export type GymPushSubscription = z.infer<typeof pushSubscriptionSchema>

export type PushStatus = z.infer<typeof pushStatusSchema>

export type PushPayload = z.infer<typeof pushPayloadSchema>
