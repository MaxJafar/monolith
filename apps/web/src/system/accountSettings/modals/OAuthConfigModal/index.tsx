import { ModalHeader, Stack, WithQueryData } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import ProviderItem from './components/ProviderItem'

export default function OAuthConfigModal({ onClose }: { onClose: () => void }) {
  return (
    <Stack gap="md" maxWidth="100%" width="560px">
      <ModalHeader
        icon="tabler:login"
        namespace="common.account-settings"
        title="oauthConfig"
        onClose={onClose}
      />
      <WithQueryData contract={workspaceAPI.auth.oauth.providers.listOptions}>
        {providers => (
          <Stack gap="sm" role="list">
            {providers.map(provider => (
              <ProviderItem key={provider.provider} entry={provider} />
            ))}
          </Stack>
        )}
      </WithQueryData>
    </Stack>
  )
}
