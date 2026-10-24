import type { Appearance } from '@monolith/blocks'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Box } from '@/components/primitives'
import {
  AppearanceContext,
  appearanceVariables
} from '@/providers/AppearanceProvider'

import { AppearanceCover } from './index'

const meta = {
  component: AppearanceCover,
  title: 'Layout/AppearanceCover'
} satisfies Meta<typeof AppearanceCover>
export default meta
type Story = StoryObj<typeof meta>

export const ColorCover: Story = {
  render: () => (
    <AppearanceContext
      value={{ appearance: { cover: { type: 'color', value: '#c5d7e8' } } }}
    >
      <AppearanceCover />
    </AppearanceContext>
  )
}

export const EditableCover: Story = {
  render: () => (
    <AppearanceContext
      value={{
        appearance: { cover: { type: 'color', value: '#c5d7e8' } },
        openEditor: () => undefined
      }}
    >
      <AppearanceCover />
    </AppearanceContext>
  )
}

function InlineExample() {
  const [appearance, setAppearance] = useState<Appearance>({
    icon: 'lucide:rocket',
    cover: { type: 'color', value: '#b7bce0' }
  })

  return (
    <AppearanceContext
      value={{
        appearance,
        openEditor: () => undefined,
        changeCover: async cover =>
          setAppearance(current => ({ ...current, cover })),
        changeIcon: async icon =>
          setAppearance(current => ({ ...current, icon }))
      }}
    >
      <AppearanceCover />
    </AppearanceContext>
  )
}

/** Pages that save inline open the icon and cover popover. */
export const InlineIconAndCover: Story = {
  render: () => <InlineExample />
}

export const DarkBackground: Story = {
  render: () => (
    <AppearanceContext
      value={{
        appearance: {
          background: '#171d29',
          cover: { type: 'color', value: '#31415d' }
        }
      }}
    >
      <Box p="md" style={appearanceVariables({ background: '#171d29' })}>
        <AppearanceCover />
      </Box>
    </AppearanceContext>
  )
}
