import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
  useModalStore
} from '@monolith/ui'

import QRLoginModal from '../modals/QRLoginModal'

export default function SignInOptions({
  disabled,
  pending,
  providers,
  onProvider
}: {
  disabled: boolean
  pending: string | null
  providers: string[]
  onProvider: (provider: string) => void
}) {
  const { open } = useModalStore()
  const { t } = useTranslation('common.auth')

  const names: Record<string, string> = { google: 'Google', github: 'GitHub' }

  return (
    <Stack gap="md" mt="lg">
      <Button
        disabled={disabled}
        icon="tabler:arrow-right"
        iconPosition="end"
        loading={pending === 'password'}
        namespace="common.auth"
        type="submit"
        width="100%"
      >
        signIn
      </Button>
      <Flex centered gap="md" my="sm">
        <Box
          aria-hidden="true"
          bg={{ base: 'bg-300', dark: 'bg-700' }}
          flex="1"
          height="1px"
        />
        <Text color="muted" size="sm">
          {t('orAuthenticateWith')}
        </Text>
        <Box
          aria-hidden="true"
          bg={{ base: 'bg-300', dark: 'bg-700' }}
          flex="1"
          height="1px"
        />
      </Flex>
      {providers.length > 0 && (
        <Grid gap="md" templateCols="repeat(auto-fit, minmax(150px, 1fr))">
          {[...new Set(providers)].map(provider => (
            <Button
              key={provider}
              disabled={disabled}
              icon={'tabler:brand-' + provider}
              loading={pending === provider}
              namespace={false}
              type="button"
              variant="secondary"
              onClick={() => onProvider(provider)}
            >
              {names[provider] ?? provider}
            </Button>
          ))}
        </Grid>
      )}
      <Button
        disabled={disabled}
        icon="tabler:qrcode"
        namespace="common.auth"
        type="button"
        variant="secondary"
        width="100%"
        onClick={() => open(QRLoginModal, {})}
      >
        qrLogin.title
      </Button>
    </Stack>
  )
}
