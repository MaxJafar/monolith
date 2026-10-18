import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ModuleHeader, Stack, Tabs } from '@monolith/ui'

import AccountAndSecurityTab from './tabs/AccountAndSecurityTab'
import PersonalInfoTab from './tabs/PersonalInfoTab'

export default function AccountSettings() {
  const { t } = useTranslation('common.account-settings')

  const [section, setSection] = useState<
    'personal-info' | 'account-and-security'
  >('personal-info')
  const sections = [
    {
      id: 'personal-info',
      name: t('tabs.personalInformation'),
      icon: 'tabler:user'
    },
    {
      id: 'account-and-security',
      name: t('tabs.accountAndSecurity'),
      icon: 'tabler:shield-lock'
    }
  ] as const

  return (
    <Stack gap="lg">
      <ModuleHeader namespace="common.account-settings" />
      <Tabs
        currentTab={section}
        enabled={sections.map(item => item.id)}
        items={sections}
        onTabChange={setSection}
      />
      <Stack
        key={section}
        aria-label={sections.find(item => item.id === section)?.name}
        gap="md"
        pb="xl"
      >
        {section === 'personal-info' ? (
          <PersonalInfoTab />
        ) : (
          <AccountAndSecurityTab />
        )}
      </Stack>
    </Stack>
  )
}
