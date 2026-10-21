// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Flex, Stack } from '@/components/primitives'

import { Button } from './index'

const meta = {
  component: Button,
  title: 'Inputs/Button',
  args: { namespace: false, children: 'Save changes' }
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
export const Actions: Story = {
  render: () => (
    <Stack gap="md">
      {(['primary', 'secondary', 'tertiary', 'plain'] as const).map(variant => (
        <Flex key={variant} gap="sm" wrap="wrap">
          <Button variant={variant} icon="tabler:check">
            save
          </Button>
          <Button variant={variant} disabled>
            save
          </Button>
          <Button variant={variant} dangerous>
            delete
          </Button>
          <Button variant={variant} loading>
            save
          </Button>
        </Flex>
      ))}
    </Stack>
  )
}
export const Progress: Story = { args: { loading: true } }
export const IconAction: Story = {
  args: {
    children: undefined,
    icon: 'tabler:plus',
    'aria-label': 'New project'
  }
}
export const Link: Story = {
  render: () => (
    <Button as="a" href="#documentation" variant="secondary" namespace={false}>
      Read documentation
    </Button>
  )
}
export const DisabledLink: Story = {
  render: () => (
    <Button as="a" href="#documentation" disabled namespace={false}>
      Read documentation
    </Button>
  )
}
