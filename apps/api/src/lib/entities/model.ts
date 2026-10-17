import z from 'zod'

export const entityKey = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,60}:[0-9a-f-]{36}$/i)

export const entityDto = z.object({
  key: z.string(),
  kind: z.string(),
  title: z.string(),
  href: z.string().nullable(),
  available: z.boolean()
})

export type Entity = z.infer<typeof entityDto>

export function isInternalPath(path: string) {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !Array.from(path).some(character => character.charCodeAt(0) < 32)
  )
}
