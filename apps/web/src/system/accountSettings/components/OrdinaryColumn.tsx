import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import { Button, Flex, OptionsColumn, Text, useModalStore } from '@monolith/ui'

import ModifyModal from '../modals/ModifyModal'
import { profileFields } from '../profile'

export default function OrdinaryColumn({
  field
}: {
  field: (typeof profileFields)[number]
}) {
  const { userData } = useAuth()
  const { open } = useModalStore()
  const { t, i18n } = useTranslation('common.account-settings')

  const raw = userData?.[field.id]

  let value = raw || t('settings.empty')

  if (raw && field.type === 'date') {
    const date = new Date(String(raw).slice(0, 10) + 'T00:00:00Z')

    if (Number.isFinite(date.getTime()))
      value = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        dateStyle: 'medium',
        timeZone: 'UTC'
      }).format(date)
  }

  return (
    <OptionsColumn
      description={t('settings.desc.' + field.label)}
      icon={field.icon}
      title={t('settings.title.' + field.label)}
    >
      <Flex align="center" gap="md" justify="between" minWidth="0" width="100%">
        <Text color="muted" style={{ overflowWrap: 'anywhere' }}>
          {value}
        </Text>
        <Button
          aria-label={t('actions.editField', {
            field: t('settings.title.' + field.label)
          })}
          disabled={!userData}
          icon="tabler:pencil"
          variant="plain"
          onClick={() => open(ModifyModal, { id: field.id })}
        />
      </Flex>
    </OptionsColumn>
  )
}
