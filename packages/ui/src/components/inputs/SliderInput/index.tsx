// SPDX-License-Identifier: 0BSD
import { type CSSProperties, useId, useState } from 'react'

import { Box, type BoxProps, Flex, Icon, Text } from '@/components/primitives'

import { useInputLabel } from '../shared/hooks/useInputLabel'
import { sliderRange } from './range'
import './slider.css'

export type SliderInputProps = Omit<BoxProps<'div'>, 'value' | 'onChange'> & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  namespace?: string | false
  renderValue?: (value: number) => string
}
export function SliderInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  icon,
  required,
  disabled,
  namespace,
  renderValue,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  ...box
}: SliderInputProps) {
  const id = useId()
  const caption = useInputLabel({
    label: label || 'rangeValue',
    namespace: label ? namespace : 'common.inputs'
  })
  const [draft, setDraft] = useState<string | null>(null)
  const range = sliderRange(value, min, max, step)
  const inactive = disabled || range.fixed
  const update = (next: number) => {
    if (!inactive) onChange(sliderRange(next, min, max, step).value)
  }
  const format = renderValue ?? ((number: number) => String(number))
  function commit() {
    if (draft !== null && draft.trim() && Number.isFinite(Number(draft)))
      update(Number(draft))
    setDraft(null)
  }
  return (
    <Box
      {...box}
      className={['monolith-range', className].filter(Boolean).join(' ')}
      data-disabled={inactive || undefined}
      width="100%"
    >
      {label && (
        <Flex justify="between" align="center" gap="md">
          <Flex as="label" htmlFor={id} align="center" gap="xs" minWidth="0">
            {icon && <Icon icon={icon} size="1rem" aria-hidden />}
            <Text size="sm" color="muted">
              {caption}
              {required && <span aria-hidden> *</span>}
            </Text>
          </Flex>
          <input
            className="monolith-range-value"
            type="number"
            aria-label={caption + ' — ' + format(range.value)}
            aria-valuetext={format(range.value)}
            disabled={inactive}
            min={range.min}
            max={range.max}
            step={range.step}
            value={draft ?? range.value}
            onChange={event => setDraft(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(null)
              }
            }}
          />
        </Flex>
      )}
      <input
        id={id}
        className="monolith-range-control"
        type="range"
        value={range.value}
        min={range.min}
        max={range.max}
        step={range.step}
        disabled={inactive}
        aria-required={required || undefined}
        aria-label={ariaLabel || caption}
        aria-labelledby={labelledBy}
        aria-valuetext={format(range.value)}
        style={
          { '--monolith-range-fill': range.progress + '%' } as CSSProperties
        }
        onChange={event => update(event.currentTarget.valueAsNumber)}
      />
      <Flex justify="between" aria-hidden="true" gap="md">
        <Text size="xs" color="muted">
          {format(range.min)}
        </Text>
        <Text size="xs" color="muted">
          {format(range.max)}
        </Text>
      </Flex>
    </Box>
  )
}
