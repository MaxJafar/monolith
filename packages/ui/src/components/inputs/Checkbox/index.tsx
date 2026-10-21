// SPDX-License-Identifier: 0BSD
import { type InputHTMLAttributes, type ReactNode, useId } from 'react'

import './checkbox.css'

type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'children'
> & {
  label?: ReactNode
  onCheckedChange?: (checked: boolean) => void
}
export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled,
  label,
  className,
  id,
  ...input
}: CheckboxProps) {
  const generated = useId()
  const identity = id ?? generated
  return (
    <span className="monolith-check" data-disabled={disabled || undefined}>
      <span className="monolith-check-box">
        <input
          {...input}
          id={identity}
          className={className}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={event => onCheckedChange?.(event.currentTarget.checked)}
        />
        <span className="monolith-check-mark" aria-hidden />
      </span>
      {label !== undefined && <label htmlFor={identity}>{label}</label>}
    </span>
  )
}
