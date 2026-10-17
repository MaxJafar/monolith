import { useQuery } from '@tanstack/react-query'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Flex,
  SidebarItem,
  SidebarTitle,
  Stack,
  WithQuery,
  useModalStore
} from '@monolith/ui'

import ModifyCategoryModal from '@/components/modals/ModifyCategoryModal'
import useFilter from '@/hooks/useFilter'
import { useInternalCategories } from '@/hooks/useInternalCategories'
import { workspaceAPI } from '@/manifest'
import { toggleSelection } from '@/utils/calendarModel'

import CategoryListItem from './components/CategoryListItem'

export default function CategoryList() {
  const query = useQuery(workspaceAPI.categories.list.queryOptions())
  const { values: internal } = useInternalCategories()
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const { selectedCategories, setCategories } = useFilter()

  return (
    <WithQuery query={query}>
      {categories => {
        const all = [...internal, ...categories]
        const ids = ['', ...all.map(item => item.id)]
        const toggle = (id: string) =>
          void setCategories(toggleSelection(selectedCategories, id, ids))
        const remove = (id: string) => {
          if (selectedCategories !== null)
            void setCategories(selectedCategories.filter(entry => entry !== id))
        }

        return (
          <Stack as="section">
            <SidebarTitle
              actionButton={{
                icon: 'tabler:plus',
                onClick: () => open(ModifyCategoryModal, { type: 'create' })
              }}
              label="Categories"
            />
            <Flex gap="xs" px="lg">
              <Button
                px="sm"
                py="xs"
                textProps={{ size: 'sm' }}
                variant="plain"
                onClick={() => void setCategories(null)}
              >
                Select All
              </Button>
              <Button
                px="sm"
                py="xs"
                textProps={{ size: 'sm' }}
                variant="plain"
                onClick={() => void setCategories([])}
              >
                Select None
              </Button>
            </Flex>
            {all.map(item => (
              <CategoryListItem
                key={item.id}
                isSelected={
                  selectedCategories === null ||
                  selectedCategories.includes(item.id)
                }
                item={item}
                modifiable={!item.id.startsWith('_')}
                onCancelSelect={() => remove(item.id)}
                onSelect={() => toggle(item.id)}
              />
            ))}
            <SidebarItem
              active={
                selectedCategories === null || selectedCategories.includes('')
              }
              icon="tabler:category"
              label={t('filters.unassignedCategory')}
              namespace={false}
              onClick={() => toggle('')}
            />
          </Stack>
        )
      }}
    </WithQuery>
  )
}
