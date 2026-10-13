import { useMemo } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { SidebarTitle, WithQuery, useModalStore } from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'
import { useWalletData } from '@/hooks/useWalletData'
import ModifyLedgerModal from '@/pages/Manage/components/modals/ModifyLedgerModal'

import LedgerSectionItem from './LedgerSectionItem'

function LedgerSection() {
  const { t } = useModuleTranslation()
  const { open } = useModalStore()
  const { ledgersQuery } = useWalletData()
  const { ledger } = useFilter()

  const ledgers = useMemo(
    () =>
      [
        {
          icon: 'tabler:book',
          name: 'allLedgers',
          color: 'white',
          id: null,
          amount: undefined
        }
      ].concat(ledgersQuery.data ?? ([] as any)),
    [ledgersQuery.data, ledger, t]
  )

  return (
    <>
      <SidebarTitle
        actionButton={{
          icon: 'tabler:plus',
          onClick: () => {
            open(ModifyLedgerModal, { type: 'create' })
          }
        }}
        label="ledgers"
      />
      <WithQuery query={ledgersQuery}>
        {() => (
          <>
            {ledgers.map(({ icon, name, color, id, amount }) => (
              <LedgerSectionItem
                key={id}
                amount={amount}
                color={color}
                icon={icon}
                id={id}
                label={name}
              />
            ))}
          </>
        )}
      </WithQuery>
    </>
  )
}

export default LedgerSection
