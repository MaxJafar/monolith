// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { discoverFonts, fontSource, useFonts } from './useFonts'

let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
it('quotes font URLs as data and rejects script/data sources', () => {
  expect(fontSource('/font.woff2', 'https://example.test/')).toBe(
    'url("https://example.test/font.woff2")'
  )
  expect(() =>
    fontSource('javascript:alert(1)', 'https://example.test/')
  ).toThrow()
  expect(() =>
    fontSource('data:text/css,body{}', 'https://example.test/')
  ).toThrow()
})
it('preserves custom font references and recognizes weight/style variants', async () => {
  const input = vi.fn(() => ({
    query: async () => ({
      family: 'My Font',
      file: { key: 'font-key' },
      weight: 600
    })
  }))
  const api = {
    fonts: { custom: { get: { input } } },
    getMedia: () => 'https://cdn.test/font.woff',
    getGoogleFont: () => ({
      query: async () => ({
        enabled: true,
        items: [
          {
            family: 'Example',
            files: {
              regular: 'https://cdn.test/400.woff',
              '700italic': 'https://cdn.test/700.woff'
            }
          },
          {
            family: 'Unrelated',
            files: { regular: 'https://cdn.test/no.woff' }
          }
        ]
      })
    })
  } as never
  const custom = await discoverFonts(api, 'custom:uuid')
  expect(input).toHaveBeenCalledWith({ id: 'uuid' })
  expect(custom[0]).toMatchObject({ family: 'My Font', weight: '600' })
  expect(await discoverFonts(api, 'Example')).toEqual([
    {
      family: 'Example',
      weight: '400',
      style: 'normal',
      url: 'https://cdn.test/400.woff'
    },
    {
      family: 'Example',
      weight: '700',
      style: 'italic',
      url: 'https://cdn.test/700.woff'
    }
  ])
})
it('ignores a stale font load after the user returns to the bundled font', async () => {
  let finish!: (value: unknown) => void
  const add = vi.fn(),
    remove = vi.fn()
  vi.stubGlobal(
    'FontFace',
    class {
      family: string
      constructor(family: string) {
        this.family = family
      }
      load() {
        return new Promise(resolve => {
          finish = () => resolve(this)
        })
      }
    }
  )
  const oldFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { add, delete: remove }
  })
  const api = {
    getGoogleFont: () => ({
      query: async () => ({
        enabled: true,
        items: [
          {
            family: 'Slow Font',
            files: { regular: 'https://cdn.test/slow.woff' }
          }
        ]
      })
    })
  } as never
  function Read({ choice }: { choice: string }) {
    useFonts(container, choice, api)
    return null
  }
  try {
    await act(async () => root.render(<Read choice="Slow Font" />))
    expect(finish).toBeTypeOf('function')
    await act(async () => root.render(<Read choice="Inter" />))
    await act(async () => finish(null))
    expect(add).not.toHaveBeenCalled()
    expect(container.style.fontFamily).toContain('Inter')
    await act(async () => root.render(null))
    expect(container.style.fontFamily).toBe('')
  } finally {
    if (oldFonts) Object.defineProperty(document, 'fonts', oldFonts)
    else Reflect.deleteProperty(document, 'fonts')
  }
})
