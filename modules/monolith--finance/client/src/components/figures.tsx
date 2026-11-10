import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Flex, Icon, Text } from '@monolith/ui'

import { type Dec, cmp, isZero, sub, toNumber } from '../../../core/money'
import { formatPercent } from '../utils/format'

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Count from the previous value to the new one. Frames show intermediate
 * approximations; the final frame always shows the exact decimal.
 */
export function AnimatedValue({
  value,
  format,
  className,
  duration = 720
}: {
  value: Dec | null
  format: (value: Dec | null) => string
  className?: string
  duration?: number
}) {
  const [frame, setFrame] = useState<string | null>(null)
  const from = useRef(0)

  useEffect(() => {
    const target = toNumber(value)
    const start = from.current

    if (value === null || reduced() || start === target) {
      from.current = target
      setFrame(null)

      return
    }

    let raf = 0

    const began = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - progress) ** 3
      const current = start + (target - start) * eased

      if (progress < 1) {
        setFrame(current.toFixed(2))
        raf = requestAnimationFrame(step)
      } else {
        from.current = target
        setFrame(null)
      }
    }

    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [value, duration])

  return (
    <span aria-live="polite" className={className}>
      {format(frame ?? value)}
    </span>
  )
}

/** Signed change against the previous period, colored by whether it helps. */
export function Delta({
  current,
  previous,
  goodWhenUp = true,
  locale
}: {
  current: Dec
  previous: Dec | null | undefined
  goodWhenUp?: boolean
  locale: string
}) {
  const { t } = useModuleTranslation()

  if (previous === null || previous === undefined) return null

  if (isZero(previous))
    return isZero(current) ? null : (
      <Text className="finance-delta" color="muted" size="xs">
        {t('overview.newThisPeriod')}
      </Text>
    )

  const change = toNumber(sub(current, previous)) / Math.abs(toNumber(previous))
  const direction = cmp(current, previous)
  const good = direction === 0 ? null : direction > 0 === goodWhenUp

  return (
    <Flex
      align="center"
      className="finance-delta"
      data-tone={good === null ? 'flat' : good ? 'good' : 'bad'}
      gap="xs"
    >
      <Icon
        aria-hidden="true"
        icon={
          direction === 0
            ? 'tabler:minus'
            : direction > 0
              ? 'tabler:arrow-up-right'
              : 'tabler:arrow-down-right'
        }
      />
      <Text size="xs">
        {t('overview.vsPrevious', {
          change: formatPercent(Math.abs(change), locale, change < 0.1 ? 1 : 0)
        })}
      </Text>
    </Flex>
  )
}

/** A KPI: label, an animated figure, an optional delta and a trend mark. */
export function StatTile({
  label,
  icon,
  tone,
  value,
  format,
  delta,
  children,
  index = 0
}: {
  label: string
  icon: string
  tone: 'income' | 'expense' | 'net' | 'accent' | 'neutral'
  value: Dec | null
  format: (value: Dec | null) => string
  delta?: ReactNode
  children?: ReactNode
  index?: number
}) {
  return (
    <section
      className="finance-tile finance-rise"
      data-tone={tone}
      style={{ '--i': index } as CSSProperties}
    >
      <Flex align="center" gap="sm">
        <span aria-hidden="true" className="finance-tile-mark">
          <Icon icon={icon} />
        </span>
        <Text color="muted" size="sm">
          {label}
        </Text>
      </Flex>
      <AnimatedValue
        className="finance-tile-value"
        format={format}
        value={value}
      />
      {delta}
      {children}
    </section>
  )
}
