export const surface = {
  light: {
    base: 'surface-container',
    dark: 'surface-container'
  },
  lightInteractive: {
    base: 'surface-container',
    dark: 'surface-container',
    hover: 'surface-container-high',
    darkHover: 'surface-container-high'
  },
  default: {
    base: 'surface',
    dark: 'surface'
  },
  defaultInteractive: {
    base: 'surface',
    dark: 'surface',
    hover: 'surface-container',
    darkHover: 'surface-container'
  }
} as const
