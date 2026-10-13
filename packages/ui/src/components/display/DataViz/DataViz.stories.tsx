import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card } from '@/components/layout/Card'
import { Grid, Stack, Text } from '@/components/primitives'
import { COLORS } from '@/system'

import { HorizontalBarChart, LineChart, ProgressRing } from '.'

const meta = {
  args: { label: 'Volume', points: [] },
  component: LineChart,
  title: 'Display/DataViz'
} satisfies Meta<typeof LineChart>

export default meta

type Story = StoryObj<typeof meta>

export const Trend: Story = {
  args: {
    formatValue: value => `${Math.round(value).toLocaleString()} kg`,
    label: 'Training volume',
    points: [
      { label: 'Oct 1', value: 1420 },
      { label: 'Oct 3', value: 1780 },
      { label: 'Oct 5', value: 1600 },
      { label: 'Oct 8', value: 2210 },
      { label: 'Oct 12', value: 2460 }
    ]
  }
}

export const MissingData: Story = {
  args: {
    label: 'Daily usage',
    points: [
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: null },
      { label: 'Wed', value: 0 },
      { label: 'Thu', value: 24 }
    ]
  }
}

export const AnalyticsPanel: Story = {
  render: () => (
    <Grid gap="md" p="md" templateCols={{ base: 1, md: 2 }}>
      <Card gap="md">
        <Text as="h3" weight="semibold">
          Work by status
        </Text>
        <HorizontalBarChart
          label="Work by status"
          points={[
            { label: 'In progress', value: 12 },
            { color: COLORS['blue-500'], label: 'Review', value: 4 },
            { color: COLORS['emerald-500'], label: 'Complete', value: 18 }
          ]}
        />
      </Card>
      <Card align="center" direction="row" gap="lg">
        <ProgressRing label="Weekly goal" max={4} value={3} />
        <Stack>
          <Text weight="semibold">Weekly goal</Text>
          <Text color="muted" size="sm">
            3 of 4 workouts
          </Text>
        </Stack>
      </Card>
    </Grid>
  )
}
