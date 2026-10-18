import { type UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

interface YearMonthData {
  years: number[]
  monthsByYear: Record<number, number[]>
}

interface YearMonth {
  year: number | null
  month: number | null
}

export default function useYearMonthState(controller: {
  queryOptions(): UseQueryOptions<YearMonthData>
}) {
  const [yearMonth, setYearMonthState] = useState<YearMonth>({
    year: null,
    month: null
  })

  const yearMonthsQuery = useQuery(controller.queryOptions())

  const yearsOptions = yearMonthsQuery.data?.years ?? []

  const monthsOptions =
    yearMonth.year !== null
      ? (yearMonthsQuery.data?.monthsByYear[yearMonth.year] ?? [])
      : []

  useEffect(() => {
    if (yearsOptions.length > 0 && yearMonth.year === null) {
      setYearMonthState(prev => ({ ...prev, year: yearsOptions[0] ?? null }))
    }
  }, [yearsOptions, yearMonth.year])

  useEffect(() => {
    if (monthsOptions.length > 0 && yearMonth.month === null) {
      setYearMonthState(prev => ({ ...prev, month: monthsOptions[0] ?? null }))
    }
  }, [monthsOptions, yearMonth.month])

  useEffect(() => {
    if (
      yearMonth.year !== null &&
      yearMonth.month !== null &&
      monthsOptions.length > 0 &&
      !monthsOptions.includes(yearMonth.month)
    ) {
      setYearMonthState(prev => ({ ...prev, month: monthsOptions[0] ?? null }))
    }
  }, [yearMonth.year, yearMonth.month, monthsOptions])

  const setYearMonth = useCallback((update: Partial<YearMonth>) => {
    setYearMonthState(prev => ({ ...prev, ...update }))
  }, [])

  return {
    yearMonth,
    setYearMonth,
    options: {
      years: yearsOptions,
      months: monthsOptions
    },
    isLoading: yearMonthsQuery.isLoading
  }
}
