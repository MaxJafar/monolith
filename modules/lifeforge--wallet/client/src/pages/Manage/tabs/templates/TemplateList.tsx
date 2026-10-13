import { useEffect } from 'react'

import type { InferOutput } from '@lifeforge/api'
import { EmptyStateScreen, Stack } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import { TemplatesTabbedView } from '../../constants/templates_tabbed_view'
import TemplateItem from './TemplateItem'

function TemplateList({
  templates,
  choosing,
  searchQuery,
  onClose
}: {
  templates: InferOutput<typeof forgeAPI.templates.list>
  choosing?: boolean
  searchQuery: string
  onClose: () => void
}) {
  const { currentTab, setAmounts } = TemplatesTabbedView.useContext()

  useEffect(() => {
    if (!templates) return

    setAmounts({
      income: templates.income.length,
      expenses: templates.expenses.length
    })
  }, [templates?.income?.length, templates?.expenses?.length, setAmounts])

  const list = templates[currentTab]

  if (list.length === 0) {
    return (
      <EmptyStateScreen
        icon="tabler:template-off"
        message={{
          id: 'templates'
        }}
      />
    )
  }

  const query = searchQuery.trim().toLowerCase()

  const filtered = query
    ? list.filter(
        template =>
          template.name.toLowerCase().includes(query) ||
          template.particulars.toLowerCase().includes(query)
      )
    : list

  if (filtered.length === 0) {
    return (
      <EmptyStateScreen
        icon="tabler:search-off"
        message={{
          id: 'results'
        }}
      />
    )
  }

  return (
    <Stack>
      {filtered.map(template => (
        <TemplateItem
          key={template.id}
          choosing={!!choosing}
          template={template}
          onClose={onClose}
        />
      ))}
    </Stack>
  )
}

export default TemplateList
