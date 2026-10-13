import { parseAsString, useQueryState } from 'nuqs'
import { createContext, useCallback, useContext, useMemo } from 'react'

export type WalletRange =
  'week' | 'month' | 'mtd' | 'quarter' | 'year' | 'ytd' | 'all' | 'custom'

interface WalletRangeContextValue {
  range: WalletRange
  setRange: (range: WalletRange) => void
  startDate: string
  endDate: string
  setStartDate: (value: string) => void
  setEndDate: (value: string) => void
  queryInput: {
    range: WalletRange
    startDate?: string
    endDate?: string
  }
}

const WalletRangeContext = createContext<WalletRangeContextValue | null>(null)

export function RangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRangeQuery] = useQueryState(
    'range',
    parseAsString.withDefault('mtd')
  )

  const [startDate, setStartDateQuery] = useQueryState(
    'startDate',
    parseAsString.withDefault('')
  )

  const [endDate, setEndDateQuery] = useQueryState(
    'endDate',
    parseAsString.withDefault('')
  )

  const setRange = useCallback(
    (value: WalletRange) => {
      setRangeQuery(value)
    },
    [setRangeQuery]
  )

  const setStartDate = useCallback(
    (value: string) => {
      setStartDateQuery(value)
    },
    [setStartDateQuery]
  )

  const setEndDate = useCallback(
    (value: string) => {
      setEndDateQuery(value)
    },
    [setEndDateQuery]
  )

  const queryInput = useMemo<WalletRangeContextValue['queryInput']>(() => {
    const rangeValue = range as WalletRange

    return rangeValue === 'custom'
      ? {
          range: rangeValue,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      : { range: rangeValue }
  }, [range, startDate, endDate])

  const value = useMemo(
    () => ({
      range: range as WalletRange,
      setRange,
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      queryInput
    }),
    [range, setRange, startDate, endDate, setStartDate, setEndDate, queryInput]
  )

  return <WalletRangeContext value={value}>{children}</WalletRangeContext>
}

export function useWalletRange() {
  const context = useContext(WalletRangeContext)

  if (!context) {
    throw new Error('useWalletRange must be used within a RangeProvider')
  }

  return context
}
