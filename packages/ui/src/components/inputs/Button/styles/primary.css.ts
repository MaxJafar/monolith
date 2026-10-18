import { COLORS, colorWithOpacity } from '@/system'

export const primary = {
  backgroundColor: 'var(--interactive-primary)',
  color: 'var(--interactive-on-primary)',
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: 'var(--interactive-primary-hover)'
    },
    '&:disabled': {
      backgroundColor: COLORS['bg-200'],
      color: COLORS['bg-400']
    },
    '.dark &:disabled': {
      backgroundColor: colorWithOpacity('bg-800', '50%').toString(),
      color: COLORS['bg-600']
    }
  }
} as const

export const primaryDangerous = {
  backgroundColor: COLORS['dangerous'],
  color: COLORS['bg-100'],
  selectors: {
    '.dark &': {
      color: COLORS['bg-800']
    },
    '&:hover:not(:disabled)': {
      backgroundColor: COLORS['red-600']
    },
    '&:disabled': {
      backgroundColor: colorWithOpacity('dangerous', '10%').toString(),
      color: colorWithOpacity('dangerous', '70%').toString()
    },
    '.dark &:disabled': {
      backgroundColor: colorWithOpacity('dangerous', '10%').toString(),
      color: colorWithOpacity('dangerous', '70%').toString()
    }
  }
} as const
