import type { Meta, StoryObj } from '@storybook/react-vite'

import { PopoverButton } from '.'

const meta = {
  component: PopoverButton,
  title: 'Overlays/PopoverButton'
} satisfies Meta<typeof PopoverButton>
export default meta
export const LinkSettings: StoryObj<typeof meta> = {
  args: {
    label: 'Link settings',
    children: (
      <>
        <label>
          Title
          <input defaultValue="Design notes" />
        </label>
        <label>
          Link
          <input placeholder="https://" />
        </label>
      </>
    )
  }
}
