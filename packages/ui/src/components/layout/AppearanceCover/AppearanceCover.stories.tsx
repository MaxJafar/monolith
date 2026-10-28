import type { Appearance } from '@monolith/blocks'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Box } from '@/components/primitives'
import {
  AppearanceContext,
  appearanceVariables
} from '@/providers/AppearanceProvider'

import { AppearanceCover, PageIdentity } from './index'

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

function PageHeaderExample({ initial }: { initial: Appearance }) {
  const [appearance, setAppearance] = useState<Appearance>(initial)

  return (
    <AppearanceContext
      value={{
        appearance,
        changeCover: async cover =>
          setAppearance(current => ({ ...current, cover })),
        changeIcon: async icon =>
          setAppearance(current => ({ ...current, icon }))
      }}
    >
      <AppearanceCover />
      <PageIdentity />
      <h1>Launch plan</h1>
    </AppearanceContext>
  )
}

/** The large icon rests on the cover's edge; hover shows Add icon and Add cover. */
export const PageHeader: Story = {
  render: () => (
    <PageHeaderExample
      initial={{
        cover: { type: 'color', value: '#b7bce0' },
        icon: 'lucide:rocket'
      }}
    />
  )
}

export const PageHeaderWithoutIcon: Story = {
  render: () => <PageHeaderExample initial={{}} />
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
