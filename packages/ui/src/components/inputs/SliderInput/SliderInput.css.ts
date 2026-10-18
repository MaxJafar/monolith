import { globalStyle, style } from '@vanilla-extract/css'

export const track = style({
  position: 'relative',
  height: '44px',
  width: '100%',
  borderRadius: '9999px'
})
export const rail = style({
  position: 'absolute',
  top: '20px',
  height: '4px',
  width: '100%',
  borderRadius: '9999px',
  background: 'var(--border-medium)'
})
export const fill = style({
  position: 'absolute',
  top: '20px',
  height: '4px',
  borderRadius: '9999px',
  background: 'var(--accent-primary)',
  pointerEvents: 'none',
  transition: 'width 70ms linear'
})
export const input = style({
  width: '100%',
  height: '44px',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: 'transparent',
  margin: 0,
  cursor: 'pointer',
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  borderRadius: '9999px'
})
export const inputDisabled = style({ opacity: 0.45, cursor: 'not-allowed' })
for (const pseudo of ['::-webkit-slider-thumb', '::-moz-range-thumb']) {
  globalStyle(`${input}${pseudo}`, {
    appearance: 'none',
    WebkitAppearance: 'none',
    height: '18px',
    width: '18px',
    borderRadius: '9999px',
    background: 'var(--bg-surface)',
    border: '2px solid var(--accent-primary)',
    boxShadow: '0 1px 4px #0002',
    cursor: 'grab',
    transition:
      'transform var(--motion-fast) var(--motion-ease), box-shadow var(--motion-fast) var(--motion-ease)'
  })
  globalStyle(`${input}:hover:not(:disabled)${pseudo}`, {
    transform: 'scale(1.12)',
    boxShadow: '0 0 0 5px var(--border-subtle)'
  })
  globalStyle(`${input}:active:not(:disabled)${pseudo}`, {
    transform: 'scale(1.18)',
    cursor: 'grabbing'
  })
  globalStyle(`${input}:disabled${pseudo}`, { cursor: 'not-allowed' })
}
globalStyle(`${input}::-moz-range-track`, {
  background: 'transparent',
  border: 0
})
