// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ListboxOption } from './components/ListboxOption'
import { ListboxInput } from './index'

const choices = [
  { id: 'planned', label: 'Planned' },
  { id: 'active', label: 'In progress' },
  { id: 'complete', label: 'Complete' }
]
const meta = {
  title: 'Inputs/ListboxInput',
  component: ListboxInput,
  args: { value: '', onChange: () => {}, children: null }
} satisfies Meta<typeof ListboxInput>
export default meta
type Story = StoryObj<typeof meta>
function StatusPicker({ multiple = false, disabled = false, compact = false }) {
  const [value, setValue] = useState<string | string[]>(
    multiple ? [] : 'planned'
  )
  return (
    <ListboxInput
      label="Status"
      icon="tabler:progress"
      namespace={false}
      variant={compact ? 'plain' : 'classic'}
      disabled={disabled}
      multiple={multiple}
      value={value}
      onChange={setValue}
      renderContent={selection =>
        choices
          .filter(option =>
            Array.isArray(selection)
              ? selection.includes(option.id)
              : selection === option.id
          )
          .map(option => option.label)
          .join(', ')
      }
    >
      {choices.map(option => (
        <ListboxOption key={option.id} value={option.id} label={option.label} />
      ))}
    </ListboxInput>
  )
}
export const ProjectStatus: Story = { render: () => <StatusPicker /> }
export const Multiple: Story = { render: () => <StatusPicker multiple /> }
export const Compact: Story = { render: () => <StatusPicker compact /> }
export const Disabled: Story = { render: () => <StatusPicker disabled /> }
