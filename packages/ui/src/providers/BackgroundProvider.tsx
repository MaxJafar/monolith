// SPDX-License-Identifier: 0BSD
import type { CSSProperties, ReactNode } from 'react'

import { usePersonalization } from './PersonalizationProvider'
import { BG_BLURS } from './PersonalizationProvider/constants/bg_blurs'
import './background.css'

function percent(value: number, fallback: number, ceiling = 300) {
  return Math.min(
    ceiling,
    Math.max(0, Number.isFinite(value) ? value : fallback)
  )
}
export function BackgroundProvider({ children }: { children: ReactNode }) {
  const {
    bgImage,
    derivedTheme,
    backdropFilters: filters
  } = usePersonalization()
  const style = bgImage
    ? ({
        '--monolith-backdrop-image': 'url(' + JSON.stringify(bgImage) + ')',
        '--monolith-backdrop-filter': [
          'blur(' + (BG_BLURS[filters.blur] ?? '0px') + ')',
          'brightness(' + percent(filters.brightness, 100) + '%)',
          'contrast(' + percent(filters.contrast, 100) + '%)',
          'saturate(' + percent(filters.saturation, 100) + '%)'
        ].join(' '),
        '--monolith-backdrop-overlay': `color-mix(in srgb, var(--color-bg-${derivedTheme === 'dark' ? 950 : 50}) ${percent(filters.overlayOpacity, 50, 100)}%, transparent)`
      } as CSSProperties)
    : undefined
  return (
    <div
      className="monolith-workspace-backdrop"
      data-image={bgImage ? '' : undefined}
      style={style}
    >
      {children}
    </div>
  )
}
