// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { TagsFilter } from './index'

const meta = {
  title: 'DataDisplay/TagsFilter',
  component: TagsFilter,
  args: { values: {}, onChange: {}, availableFilters: {} }
} satisfies Meta<typeof TagsFilter>
export default meta
type Story = StoryObj<typeof meta>
export const RemovableFilters: Story = {
  render: function Filters() {
    const [project, setProject] = useState<string | null>('release')
    const [labels, setLabels] = useState<string[] | null>(['design', 'review'])
    return (
      <TagsFilter
        values={{ project, labels }}
        onChange={{ project: setProject, labels: setLabels }}
        availableFilters={{
          project: {
            data: [{ id: 'release', label: 'Release', icon: 'tabler:folder' }]
          },
          labels: {
            isColored: true,
            data: [
              { id: 'design', label: 'Design', color: '#3486cf' },
              { id: 'review', label: 'Review', color: '#aa6fbe' }
            ]
          }
        }}
      />
    )
  }
}
