// SPDX-License-Identifier: 0BSD
import { expect, it, vi } from 'vitest'

import {
  type CatalogFont,
  browseFonts,
  fontPreviewSource,
  inspectFont
} from './settingsModel'

const parse = vi.hoisted(() => vi.fn())
vi.mock('opentype.js', () => ({ parse }))
it('combines font search, categories and favorites without mutating the catalog', () => {
  const rows: CatalogFont[] = [
    { family: 'Beacon', category: 'serif', variants: ['regular'], files: {} },
    {
      family: 'Atlas',
      category: 'sans-serif',
      variants: ['regular'],
      files: {}
    },
    { family: 'Avenue', category: 'serif', variants: ['regular'], files: {} }
  ]
  expect(
    browseFonts(rows, ' a ', 'serif', ['Avenue']).map(f => f.family)
  ).toEqual(['Avenue', 'Beacon'])
  expect(rows.map(f => f.family)).toEqual(['Beacon', 'Atlas', 'Avenue'])
  expect(browseFonts(rows, 'missing', '', [])).toEqual([])
})
it('quotes font sources and rejects active or unsupported URL schemes', () => {
  expect(fontPreviewSource({ regular: 'https://fonts.example/a.woff2' })).toBe(
    'url("https://fonts.example/a.woff2")'
  )
  expect(fontPreviewSource({ regular: 'javascript:alert(1)' })).toBeNull()
  expect(
    fontPreviewSource({ regular: 'data:font/woff2;base64,YQ==' })
  ).toBeNull()
  expect(fontPreviewSource({})).toBeNull()
})
it('reads font metadata from platform-specific names without altering the parsed font', async () => {
  const names = {
    windows: {
      fontFamily: { fr: 'Police Test' },
      fontSubfamily: { en: 'Regular' }
    }
  }
  parse.mockReturnValue({ names, tables: { os2: { usWeightClass: 580 } } })
  const file = { arrayBuffer: async () => new ArrayBuffer(4) } as File
  expect(await inspectFont(file)).toEqual({
    family: 'Police Test',
    weight: 600
  })
  expect(names.windows.fontFamily.fr).toBe('Police Test')
})
it('rejects unnamed fonts and bounds their weight', async () => {
  const file = { arrayBuffer: async () => new ArrayBuffer(4) } as File
  parse.mockReturnValueOnce({ names: {}, tables: {} })
  await expect(inspectFont(file)).rejects.toThrow('family')
  parse.mockReturnValueOnce({
    names: { fullName: { en: 'Display' } },
    tables: { os2: { usWeightClass: 3000 } }
  })
  expect((await inspectFont(file)).weight).toBe(900)
})
