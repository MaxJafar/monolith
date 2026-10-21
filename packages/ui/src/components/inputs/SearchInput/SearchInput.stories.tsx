// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { SearchInput } from './index'

const meta = {
  title: 'Inputs/SearchInput',
  component: SearchInput,
  args: {
    value: '',
    onChange: () => {},
    searchTarget: 'projects',
    namespace: false
  }
} satisfies Meta<typeof SearchInput>
export default meta
type Story = StoryObj<typeof meta>
export const FilterProjects: Story = {
  render: function Search(args) {
    const [value, setValue] = useState('')
    const matches = [
      'Release planning',
      'Design system',
      'Community garden'
    ].filter(name => name.toLowerCase().includes(value.toLowerCase()))
    return (
      <SearchInput {...args} value={value} onChange={setValue}>
        {matches.length ? (
          matches.map(name => <p key={name}>{name}</p>)
        ) : (
          <p>No projects match this search.</p>
        )}
      </SearchInput>
    )
  }
}
export const Debounced: Story = { ...FilterProjects, args: { debounceMs: 250 } }
export const Disabled: Story = { args: { disabled: true } }
