// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ComboboxOption } from './components/ComboboxOption'
import { ComboboxInput } from './index'

const projects = [
  { id: 'release', name: 'Release planning' },
  { id: 'design', name: 'Design system' },
  { id: 'garden', name: 'Community garden' }
]
const meta = {
  title: 'Inputs/ComboboxInput',
  component: ComboboxInput,
  args: {
    value: undefined,
    onChange: () => {},
    onQueryChanged: () => {},
    displayValue: () => '',
    children: null
  }
} satisfies Meta<typeof ComboboxInput>
export default meta
type Story = StoryObj<typeof meta>
function ProjectPicker({ disabled = false }) {
  const [selected, setSelected] = useState<(typeof projects)[number]>()
  const [query, setQuery] = useState('')
  const visible = projects.filter(project =>
    project.name.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <ComboboxInput
      label="Project"
      icon="tabler:folder"
      namespace={false}
      disabled={disabled}
      value={selected}
      onChange={setSelected}
      displayValue={project => project?.name ?? ''}
      onQueryChanged={setQuery}
    >
      {visible.map(project => (
        <ComboboxOption key={project.id} value={project} label={project.name} />
      ))}
    </ComboboxInput>
  )
}
export const SearchProjects: Story = { render: () => <ProjectPicker /> }
export const Disabled: Story = { render: () => <ProjectPicker disabled /> }
