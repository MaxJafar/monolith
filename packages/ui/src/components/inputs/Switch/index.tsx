// SPDX-License-Identifier: 0BSD
import type { AriaAttributes } from 'react'

import './switch.css'

type SwitchProps = AriaAttributes & {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}
export function Switch({ value, onChange, disabled, ...aria }: SwitchProps) {
  return (
    <button
      {...aria}
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      className="monolith-switch"
      onClick={() => onChange(!value)}
    >
      <span aria-hidden className="monolith-switch-thumb" />
    </button>
  )
}
