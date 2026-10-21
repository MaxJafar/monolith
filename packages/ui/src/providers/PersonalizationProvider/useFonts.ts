// SPDX-License-Identifier: 0BSD
import { useEffect } from 'react'

import type { workspaceAPI } from '@/utils/workspaceAPI'

type FontRecord = { family: string; url: string; weight: string; style: string }
export function fontSource(url: string, base: string) {
  const parsed = new URL(url, base)
  if (!['https:', 'http:', 'blob:'].includes(parsed.protocol))
    throw Error('Unsupported font URL')
  return 'url(' + JSON.stringify(parsed.href) + ')'
}
export async function discoverFonts(
  api: typeof workspaceAPI,
  choice: string
): Promise<FontRecord[]> {
  if (choice === 'Inter') return []
  if (choice.startsWith('custom:')) {
    const font = await api.fonts.custom.get
      .input({ id: choice.slice(7) })
      .query()
    if (!font.file) return []
    return [
      {
        family: font.family,
        url: api.getMedia({ key: font.file.key }),
        weight: String(font.weight),
        style: 'normal'
      }
    ]
  }
  const response = await api.getGoogleFont({ family: choice }).query()
  if (!response.enabled) return []
  return (response.items ?? [])
    .filter(font => font.family === choice)
    .flatMap(font =>
      Object.entries(font.files).map(([variant, url]) => ({
        family: font.family,
        url,
        weight:
          variant === 'regular' || variant === 'italic'
            ? '400'
            : variant.replace('italic', ''),
        style: variant.includes('italic') ? 'italic' : 'normal'
      }))
    )
    .slice(0, 24)
}
export function useFonts(
  root: HTMLElement | null,
  choice: string,
  api: typeof workspaceAPI
) {
  useEffect(() => {
    if (!root) return
    let active = true
    const previous = root.style.fontFamily
    const faces: FontFace[] = []
    let applied = ''
    const apply = (value: string) => {
      root.style.fontFamily = value
      applied = root.style.fontFamily
    }
    apply('Inter, system-ui, sans-serif')
    if (
      choice !== 'Inter' &&
      typeof FontFace !== 'undefined' &&
      document.fonts
    ) {
      void discoverFonts(api, choice)
        .then(async records => {
          if (!active) return
          const loaded = await Promise.all(
            records.map(async record => {
              try {
                return await new FontFace(
                  record.family,
                  fontSource(record.url, document.baseURI),
                  {
                    weight: record.weight,
                    style: record.style,
                    display: 'swap'
                  }
                ).load()
              } catch {
                return null
              }
            })
          )
          if (!active) return
          for (const face of loaded) {
            if (face) {
              document.fonts.add(face)
              faces.push(face)
            }
          }
          if (faces.length)
            apply(JSON.stringify(records[0].family) + ', system-ui, sans-serif')
        })
        .catch(() => {
          /* Keep the bundled font when a remote font is unavailable. */
        })
    }
    return () => {
      active = false
      for (const face of faces) document.fonts.delete(face)
      if (root.style.fontFamily === applied) root.style.fontFamily = previous
    }
  }, [root, choice, api])
}
