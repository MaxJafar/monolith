export const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)

export const accent = 'var(--color-custom-500)'

export const track = 'color-mix(in srgb, var(--color-bg-500) 15%, transparent)'

export const muted = 'var(--color-bg-500)'
