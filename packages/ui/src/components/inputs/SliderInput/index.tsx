import clsx from 'clsx'
import { useId } from 'react'

import { useInputLabel } from '@/components/inputs/shared/hooks/useInputLabel'
import { Box, type BoxProps } from '@/components/primitives'

import * as styles from './SliderInput.css'
import { SliderHeader } from './components/SliderHeader'
import { SliderTicks } from './components/SliderTicks'
import { sliderRange } from './range'

export interface SliderInputProps extends Omit<
  BoxProps<'div'>,
  'value' | 'onChange'
> {
  label?: string
  icon?: string
  value: number
  onChange: (value: number) => void
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  className?: string
  namespace?: string | false
  renderValue?: (value: number) => string
}

export function SliderInput({
  label,
  icon,
  value,
  onChange,
  required,
  disabled,
  min = 0,
  max = 100,
  step = 1,
  className,
  namespace,
  renderValue,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  ...rest
}: SliderInputProps) {
  const id = useId()

  const inputLabel = useInputLabel({
    label: label ?? 'rangeValue',
    namespace: label ? namespace : 'common.inputs'
  })
  const range = sliderRange(value, min, max, step)
  const unavailable = disabled || range.fixed
  const update = (next: number) =>
    onChange(sliderRange(next, min, max, step).value)

  return (
    <Box width="100%" {...rest}>
      <SliderHeader
        disabled={unavailable}
        icon={icon}
        inputId={id}
        label={label}
        max={range.max}
        min={range.min}
        namespace={namespace}
        renderValue={renderValue}
        required={required}
        value={range.value}
        onChange={update}
      />
      <Box
        className={clsx(
          styles.track,
          unavailable && styles.inputDisabled,
          className
        )}
      >
        <Box aria-hidden="true" className={styles.rail} />
        <Box
          aria-hidden="true"
          className={styles.fill}
          style={{ width: `${range.progress}%` }}
        />
        <input
          aria-label={ariaLabel || inputLabel}
          aria-labelledby={labelledBy}
          aria-required={required || undefined}
          aria-valuetext={renderValue?.(range.value)}
          className={styles.input}
          disabled={unavailable}
          id={id}
          max={range.max}
          min={range.min}
          step={range.step}
          type="range"
          value={range.value}
          onChange={e => {
            update(e.target.valueAsNumber)
          }}
        />
      </Box>
      <SliderTicks max={range.max} min={range.min} renderValue={renderValue} />
    </Box>
  )
}
