// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack, Text } from '@/components/primitives'

import { createViewMode } from './index'

const Library = createViewMode({
  modes: [
    { value: 'gallery', text: 'Gallery', icon: 'tabler:layout-grid' },
    { value: 'list', text: 'List', icon: 'tabler:list' }
  ] as const,
  useNuqs: false,
  namespace: false,
  persistInLocalStorage: 'storybook-library'
})
function Example() {
  return (
    <Library.Root>
      <Stack gap="md">
        <Library.Selector />
        <Library.When mode="gallery">
          <Text>Project covers appear here.</Text>
        </Library.When>
        <Library.When mode="list">
          <Text>Project rows appear here.</Text>
        </Library.When>
      </Stack>
    </Library.Root>
  )
}
const meta = { title: 'Layout/ViewMode', component: Example } satisfies Meta<
  typeof Example
>
export default meta
type Story = StoryObj<typeof meta>
export const RememberedLayout: Story = {}
