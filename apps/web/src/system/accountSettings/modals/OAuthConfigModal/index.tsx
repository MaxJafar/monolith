import { ModalHeader, Stack, WithQueryData } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import ProviderItem from './components/ProviderItem'

export default function OAuthConfigModal({ onClose }: { onClose: () => void }) {
  return (
    <Stack width="560px" maxWidth="100%" gap="md">
      <ModalHeader
        title="oauthConfig"
        namespace="common.account-settings"
        icon="tabler:login"
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
