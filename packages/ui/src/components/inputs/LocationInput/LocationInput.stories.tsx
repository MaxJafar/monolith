// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { type Location, LocationInput } from '.'

const meta = {
  title: 'Inputs/LocationInput',
  component: LocationInput,
  args: {
    value: null,
    onChange: () => {},
    label: 'Meeting place',
    namespace: false
  }
} satisfies Meta<typeof LocationInput>
export default meta
export const Search: StoryObj<typeof meta> = {
  render: args => {
    const [value, onChange] = useState<Location | null>(null)
    return <LocationInput {...args} value={value} onChange={onChange} />
  }
}
export const PreservedSelection: StoryObj<typeof meta> = {
  args: {
    disabled: true,
    value: {
      name: 'Baku',
      formattedAddress: 'Baku, Azerbaijan',
      location: { latitude: 40.4093, longitude: 49.8671 }
    }
  }
}
