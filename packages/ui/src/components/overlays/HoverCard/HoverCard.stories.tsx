import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/components/inputs'
import { Flex, Stack, Text } from '@/components/primitives'

import { HoverCard, useHoverCard } from './index'

const meta = {
  component: HoverCard,
  title: 'Overlays/HoverCard'
} satisfies Meta<typeof HoverCard>

export default meta

const events = [
  { day: 'Mon', time: '1:00 – 1:15 PM', title: 'Payroll report' },
  { day: 'Tue', time: '10:30 – 11:30 AM', title: 'Design review' },
  { day: 'Wed', time: 'All day', title: 'Launch planning' }
]

/** Hover or tab to a day. Moving between days keeps the card open. */
export const DayPreview: StoryObj = {
  render: function DayPreview() {
    const card = useHoverCard<(typeof events)[number]>()

    return (
      <>
        <Flex gap="xs">
          {events.map(event => (
            <Button
              key={event.day}
              namespace={false}
              variant="secondary"
              {...card.trigger(event)}
            >
              {event.day}
            </Button>
          ))}
        </Flex>
        <HoverCard
          card={card}
          contentKey={card.preview?.day}
          label={card.preview?.day ?? ''}
        >
          <Stack gap="xs">
            <Text weight="semibold">{card.preview?.title}</Text>
            <Text color="muted" size="sm">
              {card.preview?.time}
            </Text>
          </Stack>
        </HoverCard>
      </>
    )
  }
}
