import { z } from 'zod'

export function credentialSchema(
  creating: boolean,
  messages: { id: string; required: string }
) {
  return z
    .object({
      keyId: z
        .string()
        .trim()
        .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, messages.id),
      name: z.string().trim().min(1, messages.required),
      icon: z.string().min(1, messages.required),
      overrideKey: z.boolean(),
      key: z.string(),
      exposable: z.boolean()
    })
    .superRefine((value, context) => {
      if ((creating || value.overrideKey) && !value.key.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['key'],
          message: messages.required
        })
      }
    })
}

export function credentialUsers<
  T extends {
    name: string
    APIKeyAccess?: Record<string, { usage: string; required: boolean }>
  }
>(groups: readonly { items: readonly T[] }[], keyId: string): T[] {
  const selected = new Map<string, T>()

  for (const group of groups)
    for (const item of group.items) {
      if (Object.prototype.hasOwnProperty.call(item.APIKeyAccess ?? {}, keyId))
        selected.set(item.name, item)
    }

  return Array.from(selected.values())
}
