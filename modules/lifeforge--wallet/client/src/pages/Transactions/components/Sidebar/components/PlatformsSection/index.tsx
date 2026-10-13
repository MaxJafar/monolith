import { useMemo } from 'react'

import { SidebarTitle, WithQuery, useModalStore } from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'
import { useWalletData } from '@/hooks/useWalletData'
import ModifyPlatformModal from '@/pages/Manage/components/modals/ModifyPlatformModal'

import PlatformsSectionItem from './PlatformsSectionItem'

function PlatformsSection() {
  const { open } = useModalStore()
  const { platformsQuery } = useWalletData()
  const { type } = useFilter()

  const platforms = useMemo(
    () =>
      [
        {
          icon: 'tabler:building-store',
          name: 'allPlatforms',
          color: 'white',
          id: null as string | null,
          amount: undefined as number | undefined
        }
      ].concat(platformsQuery.data ?? []),
    [platformsQuery.data]
  )

  return type !== 'transfer' ? (
    <>
      <SidebarTitle
        actionButton={{
          icon: 'tabler:plus',
          onClick: () => {
            open(ModifyPlatformModal, { type: 'create' })
          }
        }}
        label="platforms"
      />
      <WithQuery query={platformsQuery}>
        {() => (
          <>
            {platforms.map(({ icon, name, color, id, amount }) => (
              <PlatformsSectionItem
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
  ) : (
    <></>
  )
}

export default PlatformsSection
