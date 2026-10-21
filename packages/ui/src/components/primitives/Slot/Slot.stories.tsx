// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'

import { Box, Slot, Stack, Text } from '@/components/primitives'

const meta = { title: 'Primitives/Slot', component: Slot } satisfies Meta<
  typeof Slot
>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: {
    children: <a href="#notes">Open notes</a>,
    style: {
      padding: 12,
      border: '1px solid var(--border-medium)',
      borderRadius: 8
    }
  }
}
function EventExample() {
  const [count, setCount] = useState(0)
  const [stop, setStop] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <Stack>
      <label>
        <input
          type="checkbox"
          checked={stop}
          onChange={event => setStop(event.target.checked)}
        />{' '}
        Child prevents the outer action
      </label>
      <Slot onClick={() => setCount(value => value + 1)} ref={button}>
        <button
          type="button"
          onClick={event => {
            if (stop) event.preventDefault()
          }}
        >
          Run composed action
        </button>
      </Slot>
      <Text role="status">{count} outer actions</Text>
      <button type="button" onClick={() => button.current?.focus()}>
        Focus the composed button
      </button>
    </Stack>
  )
}
export const EventsAndRef: Story = {
  args: { children: null },
  render: () => <EventExample />
}
export const AsChild: Story = {
  args: { children: null },
  render: () => (
    <Box asChild p="md" bg={{ base: 'bg-100', dark: 'bg-800' }} r="md">
      <article>
        <Text as="h2">One semantic element</Text>
        <Text>The surface adds no extra wrapper.</Text>
      </article>
    </Box>
  )
}
