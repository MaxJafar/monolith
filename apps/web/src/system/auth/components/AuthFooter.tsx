import { useTranslation } from 'react-i18next'

import { Stack, Text } from '@monolith/ui'

export default function AuthFooter() {
  const { t } = useTranslation('common.auth')
  return (
    <Stack centered as="footer" mt="xl" gap="sm">
      <Text align="center" color="muted" size="sm">
        {t('productDescription')}
      </Text>
      <Text
        as="a"
        href="https://github.com/MaxJafar/monolith/blob/main/THIRD_PARTY_NOTICES.md"
        target="_blank"
        rel="noreferrer"
        color="muted"
        size="xs"
      >
        {t('thirdPartyNotices')}
      </Text>
    </Stack>
  )
}
