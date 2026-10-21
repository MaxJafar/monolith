// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { RRuleInput } from '.'

const meta = {
  title: 'Inputs/RRuleInput',
  component: RRuleInput,
  args: { value: '', onChange: () => {}, hasDuration: true }
} satisfies Meta<typeof RRuleInput>
export default meta
export const WeeklyReview: StoryObj<typeof meta> = {
  render: () => {
    const [value, onChange] = useState(
      'DTSTART:20261020T120000Z\nRRULE:FREQ=WEEKLY;BYDAY=TU,FR||duration_amt=30;duration_unit=minute'
    )
    return (
      <div style={{ maxWidth: 480 }}>
        <RRuleInput value={value} onChange={onChange} hasDuration />
        <output>{value}</output>
      </div>
    )
  }
}
export const AdvancedRule: StoryObj<typeof meta> = {
  args: {
    value:
      'DTSTART;TZID=Asia/Baku:20261020T120000\nRRULE:FREQ=DAILY;BYHOUR=9,17'
  }
}
