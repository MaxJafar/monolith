import { useNavigate } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  FAB,
  useModalStore
} from '@lifeforge/ui'

import ChooseTemplateModal from '../modals/ChooseTemplateModal'
import ModifyTransactionsModal from '../modals/ModifyTransactionsModal'
import NaturalLanguageModal from '../modals/NaturalLanguageModal'
import ScanReceiptModal from '../modals/ScanReceiptModal'

function TransactionCreationMenu({
  mode = 'modal',
  variant
}: {
  mode?: 'modal' | 'navigate'
  variant: 'desktop' | 'mobile'
}) {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const navigate = useNavigate()

  const handleAction = (targetHash: string, callback: () => void) => () => {
    if (mode === 'navigate') {
      navigate(`/wallet/transactions#${targetHash}`)
    } else {
      callback()
    }
  }

  const items = (
    <>
      <ContextMenuItem
        icon="tabler:plus"
        label="Add Manually"
        onClick={handleAction('new', () =>
          open(ModifyTransactionsModal, { type: 'create' })
        )}
      />
      <ContextMenuItem
        icon="tabler:template"
        label="From Template"
        onClick={handleAction('template', () => open(ChooseTemplateModal, {}))}
      />
      <ContextMenuItem
        icon="tabler:scan"
        label="Scan Receipt"
        onClick={handleAction('scan', () => open(ScanReceiptModal, {}))}
      />
      <ContextMenuItem
        icon="tabler:brain"
        label="fromNaturalLanguage"
        onClick={handleAction('ai', () => open(NaturalLanguageModal, {}))}
      />
    </>
  )

  if (variant === 'desktop') {
    return (
      <ContextMenu
        buttonComponent={
          <Button
            display={{ base: 'none', md: 'flex' }}
            icon="tabler:plus"
            tProps={{ item: t('items.transaction') }}
            onClick={() => {}}
          >
            new
          </Button>
        }
        componentProps={{
          menu: {
            minWidth: '18em'
          }
        }}
      >
        {items}
      </ContextMenu>
    )
  }

  return (
    <FAB
      menuProps={{
        componentProps: {
          menu: {
            minWidth: '18em'
          }
        }
      }}
      visibilityBreakpoint="md"
    >
      {items}
    </FAB>
  )
}

export default TransactionCreationMenu
