// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { FileInput, type FileValue } from './index'

const meta = {
  title: 'Inputs/FileInput',
  component: FileInput,
  args: {
    icon: 'lucide:image',
    label: 'Project cover',
    namespace: false,
    value: { type: 'empty' },
    onChange: () => {},
    mimeTypes: { 'image/*': ['.png', '.jpg', '.webp'] },
    sources: { url: true }
  }
} satisfies Meta<typeof FileInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState<FileValue>(args.value)
    return <FileInput {...args} value={value} onChange={setValue} />
  }
}
export const Disabled: Story = { args: { disabled: true } }
export const Required: Story = {
  ...Editable,
  args: { required: true, errorMsg: 'Choose a project cover.' }
}
export const Document: Story = {
  ...Editable,
  args: {
    label: 'Attachment',
    icon: 'lucide:file',
    mimeTypes: { 'application/pdf': ['.pdf'] },
    value: {
      type: 'existing',
      id: 'attachment',
      filename: 'Release checklist.pdf'
    }
  }
}
export const OptionalSources: Story = {
  ...Editable,
  args: {
    sources: {
      url: true,
      pixabay: true,
      ai: { defaultPrompt: 'A quiet architectural study in graphite and blue.' }
    }
  }
}
