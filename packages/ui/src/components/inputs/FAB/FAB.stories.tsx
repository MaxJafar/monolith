// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ContextMenuItem } from '@/components/overlays'

import { FAB } from '.'

const meta = { title: 'Inputs/FAB', component: FAB } satisfies Meta<typeof FAB>
export default meta
export const CreateAction: StoryObj<typeof meta> = {
  args: {
    visibilityBreakpoint: false,
    'aria-label': 'Create action',
    icon: 'tabler:plus'
  }
}
export const CreationMenu: StoryObj<typeof meta> = {
  render: () => (
    <FAB visibilityBreakpoint={false} aria-label="Create">
      <ContextMenuItem
        namespace={false}
        label="Project"
        icon="tabler:folder-plus"
        onClick={() => {}}
      />
      <ContextMenuItem
        namespace={false}
        label="Action"
        icon="tabler:plus"
        onClick={() => {}}
      />
    </FAB>
  )
}
