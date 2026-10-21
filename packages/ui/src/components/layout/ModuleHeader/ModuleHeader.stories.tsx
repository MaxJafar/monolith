// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ModuleMetadataProvider } from '@monolith/federation'

import { Button } from '@/components/inputs'

import { ModuleHeader } from './index'

const meta: Meta<typeof ModuleHeader> = {
  title: 'Layout/ModuleHeader',
  component: ModuleHeader,
  args: { namespace: false },
  render: args => (
    <ModuleMetadataProvider
      value={{ name: 'projects', title: 'Projects', icon: 'tabler:stack-2' }}
    >
      <ModuleHeader {...args} />
    </ModuleMetadataProvider>
  )
}
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const NamedSection: Story = {
  args: { title: 'Research library', icon: 'tabler:books' }
}
export const WithAction: Story = {
  args: {
    trailing: (
      <Button namespace={false} icon="tabler:plus" onClick={() => {}}>
        New project
      </Button>
    )
  }
}
