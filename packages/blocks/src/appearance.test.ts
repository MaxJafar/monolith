import { describe, expect, it } from 'vitest'

import {
  APPEARANCE_LAYOUT_KEY,
  appearanceSchema,
  fontStylesheet,
  readAppearanceRecord,
  resolveAppearance,
  styledIcon
} from './appearance'

describe('Appearance inheritance and safe persisted choices', () => {
  it('inherits individual tokens and keeps identity scoped to its page', () => {
    expect(
      resolveAppearance(
        {
          background: '#ffffff',
          accent: '#225588',
          icon: 'lucide:house',
          font: { provider: 'bunny', family: 'Inter' }
        },
        { accent: '#114433', button: '#114433', icon: 'tabler:layers' },
        { icons: '#335577', icon: 'ph:star-fill' }
      )
    ).toEqual({
      background: '#ffffff',
      accent: '#114433',
      button: '#114433',
      icons: '#335577',
      icon: 'ph:star-fill',
      font: { provider: 'bunny', family: 'Inter' }
    })
  })
  it('allows removing an inherited cover without removing other settings', () => {
    expect(
      resolveAppearance(
        { cover: { type: 'color', value: '#aabbcc' }, accent: '#225588' },
        {},
        { cover: null }
      )
    ).toEqual({ cover: null, accent: '#225588' })
    expect(resolveAppearance({}, { icon: 'tabler:home' })).not.toHaveProperty(
      'icon'
    )
  })
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    'file:///etc/passwd',
    'https://user:password@example.com/cover.jpg'
  ])('rejects unsafe cover URL %s', value => {
    expect(
      appearanceSchema.safeParse({
        cover: { type: 'image', value, position: 50 }
      }).success
    ).toBe(false)
  })
  it('preserves a storage identity without persisting a device URL', () => {
    expect(
      appearanceSchema.parse({
        cover: { type: 'image', value: '', fileKey: 'user/cover-123.webp' }
      }).cover
    ).toEqual({
      type: 'image',
      value: '',
      fileKey: 'user/cover-123.webp',
      position: 50
    })
    expect(
      appearanceSchema.safeParse({
        cover: { type: 'image', value: '', fileKey: '../private.webp' }
      }).success
    ).toBe(false)
    expect(
      appearanceSchema.safeParse({
        cover: {
          type: 'image',
          value: 'https://example.com/a.jpg',
          fileKey: 'user/cover.webp'
        }
      }).success
    ).toBe(false)
  })
  it.each([
    { background: 'red;display:none' },
    { button: '#123' },
    { radius: 25 },
    { icon: 'https://example.com/icon.svg' },
    { font: { provider: 'bunny', family: 'monospace' } },
    { font: { provider: 'system', family: 'Inter' } },
    { unknown: true }
  ])('rejects unbounded or invalid choices %j', value => {
    expect(appearanceSchema.safeParse(value).success).toBe(false)
  })
  it('reads older profiles safely while retaining revision protection', () => {
    expect(readAppearanceRecord(null)).toEqual({ revision: 0, appearance: {} })
    const saved = { revision: 4, appearance: { icons: '#224466' } }
    expect(
      readAppearanceRecord({ calendar: [], [APPEARANCE_LAYOUT_KEY]: saved })
    ).toEqual(saved)
    expect(
      readAppearanceRecord({
        [APPEARANCE_LAYOUT_KEY]: {
          appearance: { background: 'invalid' },
          revision: 99
        }
      })
    ).toEqual({ revision: 0, appearance: {} })
  })
  it('uses provider-specific styles without rewriting explicitly chosen icons', () => {
    expect(styledIcon('lucide:file-text', 'ph-fill')).toBe('ph:file-text-fill')
    expect(styledIcon('lucide:database', 'ri-line')).toBe('ri:database-2-line')
    expect(styledIcon('tabler:home', 'ph')).toBe('ph:house')
    expect(styledIcon('simple-icons:github', 'ph')).toBe('simple-icons:github')
    expect(styledIcon('lucide:unknown-custom-icon', 'tabler')).toBe(
      'lucide:unknown-custom-icon'
    )
  })
  it('loads font CSS without an API key and keeps offline fonts local', () => {
    expect(
      fontStylesheet({ provider: 'google', family: 'Open Sans' })
    ).toContain('family=Open+Sans:wght@400;500;600;700')
    expect(
      fontStylesheet({ provider: 'bunny', family: 'JetBrains Mono' })
    ).toContain('fonts.bunny.net/css?family=jetbrains-mono')
    expect(fontStylesheet({ provider: 'fontsource', family: 'Lora' })).toBe(
      'https://cdn.jsdelivr.net/fontsource/css/lora@5/index.css'
    )
    expect(fontStylesheet({ provider: 'system', family: 'serif' })).toBeNull()
  })
})
