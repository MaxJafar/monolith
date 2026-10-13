import type { Meta, StoryObj } from '@storybook/react-vite'

import { Text } from '@/components/primitives'

import { WorkspaceCanvas } from './index'

const meta = {
  component: WorkspaceCanvas,
  parameters: {
    docs: {
      description: {
        component:
          'Owned editable page shell. ModuleWrapper supplies module metadata and the authenticated application supplies the core page contract and installed widget catalog. Native area dashboards remain connected to their existing providers.'
      }
    }
  },
  title: 'Layout/WorkspaceCanvas'
} satisfies Meta<typeof WorkspaceCanvas>

export default meta

type Story = StoryObj<typeof meta>

export const AreaPage: Story = {
  args: {
    native: <Text>Connected area dashboard</Text>,
    title: 'Workspace'
  }
}
