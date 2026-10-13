import { useModuleTranslation } from '@lifeforge/localization'
import { SidebarDivider, SidebarItem, SidebarWrapper } from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'

import CategoriesSection from './components/CategoriesSection'
import DifficultiesSection from './components/DifficultiesSection'

function Sidebar() {
  const { t } = useModuleTranslation()
  const { updateFilter, filter } = useFilter()

  return (
    <SidebarWrapper>
      <SidebarItem
        active={!filter.category && !filter.difficulty}
        icon="tabler:award"
        label={t('headers.all')}
        namespace={false}
        onClick={() => {
          updateFilter('category', null)
          updateFilter('difficulty', null)
        }}
      />
      <SidebarItem
        active={false}
        icon="tabler:star"
        label="Starred Achievements"
        onClick={() => {}}
      />
      <SidebarDivider />
      <DifficultiesSection />
      <SidebarDivider />
      <CategoriesSection />
    </SidebarWrapper>
  )
}

export default Sidebar
