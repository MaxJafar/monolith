import { useModuleTranslation } from '@lifeforge/localization'
import { Button, FAB, ModuleHeader, Stack, useModalStore } from '@lifeforge/ui'

import RangeSelector from '@/components/RangeSelector'
import { RangeProvider } from '@/providers/RangeProvider'

import ModifyCategoryModal from './components/modals/ModifyCategoryModal'
import ModifyLedgerModal from './components/modals/ModifyLedgerModal'
import ModifyPlatformModal from './components/modals/ModifyPlatformModal'
import ModifyTemplatesModal from './components/modals/ModifyTemplatesModal'
import { ManageTabbedView } from './constants/tabbed_view'
import CategoriesSection from './tabs/categories/CategoriesSection'
import LedgersSection from './tabs/ledgers/LedgersSection'
import PlatformsSection from './tabs/platforms/PlatformsSection'
import TemplatesSection from './tabs/templates/TemplatesSection'

function ManageContent() {
  const { currentTab } = ManageTabbedView.useContext()
  const { open } = useModalStore()
  const { t } = useModuleTranslation()

  const tabs = {
    categories: {
      item: 'category',
      create: () => open(ModifyCategoryModal, { type: 'create' }),
      Section: CategoriesSection
    },
    platforms: {
      item: 'platform',
      create: () => open(ModifyPlatformModal, { type: 'create' }),
      Section: PlatformsSection
    },
    templates: {
      item: 'template',
      create: () => open(ModifyTemplatesModal, { type: 'create' }),
      Section: TemplatesSection
    },
    ledgers: {
      item: 'ledger',
      create: () => open(ModifyLedgerModal, { type: 'create' }),
      Section: LedgersSection
    }
  } as const

  const { item, create, Section } = tabs[currentTab]

  return (
    <>
      <ModuleHeader
        icon="tabler:adjustments"
        title="manage"
        trailing={
          <Button
            display={{ base: 'none', sm: 'flex' }}
            icon="tabler:plus"
            tProps={{
              item: t(`items.${item}`)
            }}
            onClick={create}
          >
            new
          </Button>
        }
      />
      <RangeSelector />
      <ManageTabbedView.Selector />
      <Stack mb="lg" mt="md">
        <Section />
      </Stack>
      <FAB icon="tabler:plus" onClick={create} />
    </>
  )
}

function Manage() {
  return (
    <RangeProvider>
      <ManageTabbedView.Root>
        <ManageContent />
      </ManageTabbedView.Root>
    </RangeProvider>
  )
}

export default Manage
