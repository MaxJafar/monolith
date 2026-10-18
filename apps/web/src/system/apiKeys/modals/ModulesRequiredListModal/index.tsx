import { useTranslation } from 'react-i18next'

import { useFederation } from '@monolith/federation'
import { Card, Flex, Icon, ModalHeader, Stack, Text } from '@monolith/ui'

import { credentialUsers } from '../../model'

export default function ModulesRequiredListModal({
  data: { keyId },
  onClose
}: {
  data: { keyId: string }
  onClose: () => void
}) {
  const { moduleGroups } = useFederation()
  const { t, i18n } = useTranslation('common.api-keys')

  const consumers = credentialUsers(moduleGroups, keyId)

  return (
    <Stack gap="md" maxWidth="100%" width="520px">
      <ModalHeader
        icon="tabler:apps"
        namespace="common.api-keys"
        title="modulesRequired.title"
        onClose={onClose}
      />
      <Text color="muted">
        {t('modals.modulesRequired.totalModulesRequire', {
          count: consumers.length
        })}
      </Text>
      <Stack gap="sm" role="list">
        {consumers.map(addon => {
          const access = addon.APIKeyAccess![keyId]!

          return (
            <Card key={addon.name} gap="sm" role="listitem">
              <Flex align="center" gap="sm">
                <Icon color="muted" icon={addon.icon} />
                <Text weight="medium">
                  {i18n.t('title', {
                    ns: 'apps.' + addon.name,
                    defaultValue: addon.name
                  })}
                </Text>
              </Flex>
              <Text color="muted">{access.usage}</Text>
              <Text size="sm">
                {t(
                  'modals.modulesRequired.' +
                    (access.required ? 'required' : 'optional')
                )}
              </Text>
            </Card>
          )
        })}
      </Stack>
    </Stack>
  )
}
