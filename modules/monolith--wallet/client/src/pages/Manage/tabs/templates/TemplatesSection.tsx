import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Alert, SearchInput, WithQueryData, surface } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import { TemplatesTabbedView } from '../../constants/templates_tabbed_view'
import TemplateList from './TemplateList'

function TemplatesSection() {
  const { t } = useModuleTranslation()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <TemplatesTabbedView.Root>
      <TemplatesTabbedView.Selector />
      <Alert type="note">{t('messages.aiAccuracy')}</Alert>
      <SearchInput
        bg={surface.lightInteractive}
        debounceMs={300}
        my="md"
        searchTarget="template"
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <WithQueryData contract={workspaceAPI.templates.list}>
        {templates => (
          <TemplateList
            searchQuery={searchQuery}
            templates={templates}
            onClose={() => {}}
          />
        )}
      </WithQueryData>
    </TemplatesTabbedView.Root>
  )
}

export default TemplatesSection
