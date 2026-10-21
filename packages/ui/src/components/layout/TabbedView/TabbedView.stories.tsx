// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/components/inputs/Button'
import { Stack, Text } from '@/components/primitives'

import { createTabbedView } from './index'

const Journal = createTabbedView({
  tabs: [
    { id: 'all', name: 'All records', amount: 8 },
    { id: 'recent', name: 'Recent', amount: 3 }
  ] as const,
  namespace: false
})
function Counts() {
  const { setAmounts, amounts } = Journal.useContext()
  return (
    <Button
      namespace={false}
      variant="secondary"
      onClick={() => setAmounts({ recent: (amounts.recent ?? 3) + 1 })}
    >
      Record another milestone
    </Button>
  )
}
function Example() {
  return (
    <Journal.Root>
      <Stack gap="md">
        <Journal.Selector />
        <Journal.When tabId="all">
          <Text>All of your saved milestones.</Text>
        </Journal.When>
        <Journal.When tabId="recent">
          <Text>Milestones recorded this week.</Text>
        </Journal.When>
        <Counts />
      </Stack>
    </Journal.Root>
  )
}
const meta = { title: 'Layout/TabbedView', component: Example } satisfies Meta<
  typeof Example
>
export default meta
type Story = StoryObj<typeof meta>
export const LocalState: Story = {}
