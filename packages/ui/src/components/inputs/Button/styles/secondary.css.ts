import { COLORS, colorWithOpacity } from '@/system'

export const secondary = {
  backgroundColor: COLORS['surface-container'],
  color: COLORS['text-primary'],
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: COLORS['surface-container-high']
    },
    '&:disabled': {
      borderColor: COLORS['bg-300'],
      color: COLORS['bg-300']
    },
    '.dark &:disabled': {
      borderColor: COLORS['bg-700'],
      color: COLORS['bg-700']
    }
  }
} as const

export const secondaryDangerous = {
  borderColor: COLORS['dangerous'],
  color: COLORS['dangerous'],
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: COLORS['dangerous'],
      color: COLORS['bg-100']
    },
    '.dark &:hover:not(:disabled)': {
      color: COLORS['bg-800']
    },
    '&:disabled': {
      borderColor: colorWithOpacity('dangerous', '70%').toString(),
      color: colorWithOpacity('dangerous', '70%').toString()
    },
    '.dark &:disabled': {
      borderColor: colorWithOpacity('dangerous', '70%').toString(),
      color: colorWithOpacity('dangerous', '70%').toString()
    }
  }
} as const
