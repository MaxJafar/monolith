// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ListboxOption } from '../ListboxInput/components/ListboxOption'
import { Listbox } from './index'

const choices = ['Inbox', 'Scheduled', 'Done']
const options = choices.map(value => (
  <ListboxOption key={value} value={value} label={value} />
))
const meta: Meta<typeof Listbox> = {
  title: 'Inputs/Listbox',
  component: Listbox
}
export default meta
type Story = StoryObj
function SingleChoice({ disabled = false }: { disabled?: boolean }) {
  const [value, change] = useState(choices[0])
  return (
    <Listbox
      aria-label="Action status"
      disabled={disabled}
      value={value}
      onChange={change}
    >
      {options}
    </Listbox>
  )
}
function SeveralChoices() {
  const [value, change] = useState(['Inbox'])
  return (
    <Listbox<string>
      multiple
      aria-label="Visible statuses"
      value={value}
      onChange={change}
      renderContent={selected => selected.join(' · ') || 'Choose statuses'}
    >
      {options}
    </Listbox>
  )
}
export const Default: Story = { render: () => <SingleChoice /> }
export const Disabled: Story = { render: () => <SingleChoice disabled /> }
export const MultipleOptions: Story = { render: () => <SeveralChoices /> }
