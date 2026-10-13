import { style } from '@vanilla-extract/css'

// SVG geometry and screen-reader clipping are outside the primitive API.
export const chartFrame = style({ containerType: 'inline-size' })

export const axisLabel = style({
  fontSize: '11px',
  '@container': {
    '(max-width: 480px)': { fontSize: '20px' }
  }
})

export const chartSvg = style({
  display: 'block',
  width: '100%',
  height: 'auto',
  overflow: 'visible',
  fontVariantNumeric: 'tabular-nums',
  '@media': {
    '(max-width: 639px)': { minHeight: '11rem' }
  }
})

export const pointTarget = style({
  outline: 'none',
  selectors: {
    '&:focus-visible': {
      stroke: 'var(--color-custom-500)',
      strokeWidth: 2
    }
  }
})

export const numeric = style({ fontVariantNumeric: 'tabular-nums' })

export const screenReaderTable = style({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0
})
