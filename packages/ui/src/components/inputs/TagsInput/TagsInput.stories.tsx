// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { TagsInput } from '.'

const meta = {
  title: 'Inputs/TagsInput',
  component: TagsInput,
  args: { value: [], onChange: () => {}, placeholder: 'Add a label' }
} satisfies Meta<typeof TagsInput>
export default meta
export const ProjectLabels: StoryObj<typeof meta> = {
  render: () => {
    const [value, onChange] = useState(['Design', 'Review'])
    return (
      <TagsInput
        label="Project labels"
        icon="tabler:tags"
        namespace={false}
        value={value}
        onChange={onChange}
        placeholder="Add a label"
        maxTags={5}
      />
    )
  }
}
export const Disabled: StoryObj<typeof meta> = {
  args: {
    label: 'Project labels',
    namespace: false,
    disabled: true,
    value: ['Pinned'],
    onChange: () => {},
    placeholder: 'Add a label'
  }
}
