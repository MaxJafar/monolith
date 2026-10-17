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
    <Stack width="520px" maxWidth="100%" gap="md">
      <ModalHeader
        namespace="common.api-keys"
        title="modulesRequired.title"
        icon="tabler:apps"
        onClose={onClose}
      />
      <Text color="muted">
        {t('modals.modulesRequired.totalModulesRequire', {
          count: consumers.length
        })}
      </Text>
      <Stack role="list" gap="sm">
        {consumers.map(addon => {
          const access = addon.APIKeyAccess![keyId]!
          return (
            <Card key={addon.name} role="listitem" gap="sm">
              <Flex align="center" gap="sm">
                <Icon icon={addon.icon} color="muted" />
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
