import {
  keepPreviousData,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'

import { convert } from '../../core/fx'
import { type Dec, sub } from '../../core/money'
import {
  type PeriodRange,
  isCivilDate,
  periodRange,
  previousRange,
  shiftAnchor,
  todayCivil
} from '../../core/periods'
import type { Snapshot, Summary } from '../../core/schemas'
import type { TaxRuleCore } from '../../core/tax'
import { workspaceAPI } from '../manifest'
import { FinanceContext } from './FinanceContext'
import { type MoneyFormat, formatMoney } from './utils/format'
import { getGranularity, getSection } from './utils/navigation'

type RunResult<T> = { ok: true; value: T } | { ok: false; error: string }

const STALE_RATES = 12 * 60 * 60 * 1000

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()
  const { i18n } = useModuleTranslation()

  const ownerId = userData?.id ?? null

  const queryClient = useQueryClient()
  const mountedAt = useRef(Date.now())
  const alive = useRef(true)
  const locked = useRef(false)
  const synced = useRef(false)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const [displayOverride, setDisplayOverride] = useState<string | null>(null)

  const today = todayCivil()
  const locale = i18n.resolvedLanguage || i18n.language || 'en'

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  const query = useQuery(
    workspaceAPI.snapshot.queryOptions({
      queryKey: [...workspaceAPI.snapshot.key, ownerId],
      enabled: !!ownerId,
      staleTime: 30000,
      refetchOnWindowFocus: true
    })
  )
  const data: Snapshot | undefined =
    ownerId && query.dataUpdatedAt >= mountedAt.current ? query.data : undefined

  const section = getSection(params.get('section'))
  const granularity = getGranularity(params.get('period'))
  const at = params.get('at')
  const anchor = at && isCivilDate(at) ? at : today
  const weekStart = data?.settings.week_start ?? 1
  const range: PeriodRange = useMemo(
    () =>
      periodRange(
        granularity,
        anchor,
        weekStart,
        data?.earliest_on ?? undefined
      ),
    [granularity, anchor, weekStart, data?.earliest_on]
  )
  const previous = useMemo(
    () => previousRange(granularity, anchor, weekStart),
    [granularity, anchor, weekStart]
  )

  const summaryInput = {
    from: range.from,
    to: range.to,
    bucket: range.bucket,
    ...(previous
      ? { compare_from: previous.from, compare_to: previous.to }
      : {})
  }
  const summaryQuery = useQuery(
    workspaceAPI.summary.input(summaryInput).queryOptions({
      queryKey: [
        ...workspaceAPI.summary.key,
        ownerId,
        summaryInput.from,
        summaryInput.to,
        summaryInput.bucket,
        summaryInput.compare_from ?? null
      ],
      enabled: !!ownerId && !!data?.settings.configured,
      staleTime: 30000,
      placeholderData: keepPreviousData
    })
  )
  const summary: Summary | undefined = summaryQuery.data

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        current => {
          const next = new URLSearchParams(current)

          Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          })

          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: workspaceAPI.key }),
    [queryClient]
  )

  const run = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      { quiet = false }: { quiet?: boolean } = {}
    ): Promise<RunResult<T>> => {
      if (!ownerId || locked.current)
        return { ok: false, error: 'Another change is still saving.' }
      locked.current = true
      setPending(true)
      if (!quiet) setActionError(null)

      try {
        const value = await operation()

        if (alive.current) await invalidate()

        return { ok: true, value }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (alive.current) {
          if (!quiet) setActionError(message)
          await invalidate()
        }

        return { ok: false, error: message }
      } finally {
        locked.current = false
        if (alive.current) setPending(false)
      }
    },
    [ownerId, invalidate]
  )

  // On open: book due auto-post items and refresh stale market rates once.
  useEffect(() => {
    if (!data?.settings.configured || synced.current) return
    synced.current = true

    const due = data.recurring.some(
      item =>
        item.active && item.auto_post && item.next_on && item.next_on <= today
    )
    const stale = Object.values(data.rates.entries).some(
      entry =>
        entry.source !== 'base' &&
        entry.code !== 'USD' &&
        (!entry.market_at ||
          Date.now() - Date.parse(entry.market_at) > STALE_RATES)
    )

    void (async () => {
      try {
        if (due) await workspaceAPI.plan.post.mutate({ today, automatic: true })
        if (stale) await workspaceAPI.rates.refresh.mutate(undefined)
        if ((due || stale) && alive.current) await invalidate()
      } catch {
        /* Rates stay as they were; the Currencies page offers a retry. */
      }
    })()
  }, [data, today, invalidate])

  const display =
    displayOverride ??
    data?.settings.display_currency ??
    data?.settings.base_currency ??
    'AZN'
  const base = data?.settings.base_currency ?? 'AZN'
  const book = data?.rates

  const setDisplay = useCallback(
    (code: string) => {
      setDisplayOverride(code)
      if (!data) return
      void workspaceAPI.settings.save
        .mutate({ ...stripSettings(data.settings), display_currency: code })
        .then(() => invalidate())
        .catch(() => undefined)
    },
    [data, invalidate]
  )

  const toDisplay = useCallback(
    (value: Dec | null | undefined): Dec | null => {
      if (value === null || value === undefined || !book) return null

      return convert(book, value, base, display)
    },
    [book, base, display]
  )

  /** A base-currency figure, shown in the chosen display currency. */
  const money = useCallback(
    (value: Dec | null | undefined, format?: MoneyFormat) => {
      const converted = toDisplay(value)

      return converted === null
        ? formatMoney(value, base, locale, format)
        : formatMoney(converted, display, locale, format)
    },
    [toDisplay, base, display, locale]
  )

  /**
   * a − b in the display currency, from each side converted on its own, so
   * the figures shown beside it (income, spending) always add up exactly.
   */
  const shownDifference = useCallback(
    (a: Dec, b: Dec) => {
      const left = toDisplay(a)
      const right = toDisplay(b)

      return left !== null && right !== null
        ? { value: sub(left, right), code: display }
        : { value: sub(a, b), code: base }
    },
    [toDisplay, display, base]
  )

  const native = useCallback(
    (value: Dec | null | undefined, code: string, format?: MoneyFormat) =>
      formatMoney(value, code, locale, format),
    [locale]
  )

  const lookups = useMemo(() => {
    const rules = new Map(data?.tax_rules.map(rule => [rule.id, rule]) ?? [])

    return {
      accountsById: new Map(data?.accounts.map(item => [item.id, item]) ?? []),
      categoriesById: new Map(
        data?.categories.map(item => [item.id, item]) ?? []
      ),
      rulesById: rules,
      listsById: new Map(data?.lists.map(item => [item.id, item]) ?? []),
      ruleCore: (id: string | null | undefined): TaxRuleCore | null => {
        const rule = id ? rules.get(id) : undefined

        return rule
          ? {
              kind: rule.kind,
              rate: rule.rate,
              inclusive: rule.inclusive,
              withheld: rule.withheld,
              components: rule.components
            }
          : null
      }
    }
  }, [data])

  const value = {
    ownerId,
    data,
    summary,
    summaryLoading: summaryQuery.isPending,
    section,
    params,
    updateParams,
    granularity,
    anchor,
    range,
    previous,
    today,
    setGranularity: (next: string) =>
      updateParams({ period: next === 'month' ? null : next }),
    shiftPeriod: (delta: number) =>
      updateParams({ at: shiftAnchor(granularity, anchor, delta) }),
    resetPeriod: () => updateParams({ at: null }),
    display,
    base,
    book,
    locale,
    setDisplay,
    toDisplay,
    money,
    native,
    shownDifference,
    ...lookups,
    pending,
    loading: query.isPending || (!data && query.isFetching),
    refreshing: query.isFetching || summaryQuery.isFetching,
    error: actionError ?? (query.error ? query.error.message : null),
    clearError: () => setActionError(null),
    refresh: () => {
      setActionError(null)
      void invalidate()
    },
    run
  }

  return <FinanceContext value={value}>{children}</FinanceContext>
}

/** The editable settings fields, for a save that changes one of them. */
export function stripSettings(settings: Snapshot['settings']) {
  const { configured: _configured, updated, ...values } = settings

  return { ...values, expected_updated: updated }
}

export type FinanceState = {
  ownerId: string | null
  data: Snapshot | undefined
  summary: Summary | undefined
  summaryLoading: boolean
  section: ReturnType<typeof getSection>
  params: URLSearchParams
  updateParams: (changes: Record<string, string | null>) => void
  granularity: ReturnType<typeof getGranularity>
  anchor: string
  range: PeriodRange
  previous: PeriodRange | null
  today: string
  setGranularity: (next: string) => void
  shiftPeriod: (delta: number) => void
  resetPeriod: () => void
  display: string
  base: string
  book: Snapshot['rates'] | undefined
  locale: string
  setDisplay: (code: string) => void
  toDisplay: (value: Dec | null | undefined) => Dec | null
  money: (value: Dec | null | undefined, format?: MoneyFormat) => string
  shownDifference: (a: Dec, b: Dec) => { value: Dec; code: string }
  native: (
    value: Dec | null | undefined,
    code: string,
    format?: MoneyFormat
  ) => string
  accountsById: Map<string, Snapshot['accounts'][number]>
  categoriesById: Map<string, Snapshot['categories'][number]>
  rulesById: Map<string, Snapshot['tax_rules'][number]>
  listsById: Map<string, Snapshot['lists'][number]>
  ruleCore: (id: string | null | undefined) => TaxRuleCore | null
  pending: boolean
  loading: boolean
  refreshing: boolean
  error: string | null
  clearError: () => void
  refresh: () => void
  run: <T>(
    operation: () => Promise<T>,
    options?: { quiet?: boolean }
  ) => Promise<RunResult<T>>
}
