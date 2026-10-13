import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

import type { InferOutput } from '@lifeforge/api'

import { forgeAPI } from '@/manifest'

export type StatementData = InferOutput<typeof forgeAPI.statements.get>

function useStatementDataState(year: number, month: number) {
  const statementQuery = useQuery(
    forgeAPI.statements.get
      .input({ year: String(year), month: String(month + 1) })
      .queryOptions()
  )

  return { statementQuery }
}

type StatementDataContextValue = ReturnType<typeof useStatementDataState>

const StatementDataContext = createContext<StatementDataContextValue | null>(
  null
)

export function StatementDataProvider({
  year,
  month,
  children
}: {
  year: number
  month: number
  children: React.ReactNode
}) {
  const value = useStatementDataState(year, month)

  return <StatementDataContext value={value}>{children}</StatementDataContext>
}

export function useStatementData() {
  const context = useContext(StatementDataContext)

  if (!context) {
    throw new Error(
      'useStatementData must be used within a StatementDataProvider'
    )
  }

  return context
}
