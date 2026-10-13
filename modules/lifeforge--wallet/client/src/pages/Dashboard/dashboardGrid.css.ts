import { style } from '@vanilla-extract/css'

import { vars } from '@lifeforge/ui'

/**
 * The single source of truth for the wallet dashboard layout.
 *
 * The placement of every widget is defined here as a CSS grid template
 * (`grid-template-areas`), so individual widgets no longer declare
 * `gridColumnSpan` / `gridRowSpan` themselves.
 */
export const dashboardGrid = style({
  display: 'grid',
  gap: vars.space.sm,
  gridTemplateColumns: '1fr',
  gridTemplateAreas: `
    "income"
    "expenses"
    "assetsBalance"
    "statisticChart"
    "activityCalendar"
    "categoriesBreakdown"
    "platformsBreakdown"
    "recentTransactions"
  `,
  '@media': {
    'screen and (min-width: 1280px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateAreas: `
        "income expenses assetsBalance"
        "statisticChart statisticChart assetsBalance"
        "statisticChart statisticChart assetsBalance"
        "activityCalendar activityCalendar assetsBalance"
        "activityCalendar activityCalendar assetsBalance"
        "recentTransactions recentTransactions categoriesBreakdown"
        "recentTransactions recentTransactions categoriesBreakdown"
        "recentTransactions recentTransactions categoriesBreakdown"
        "recentTransactions recentTransactions platformsBreakdown"
        "recentTransactions recentTransactions platformsBreakdown"
        "recentTransactions recentTransactions platformsBreakdown"
      `
    }
  }
})
