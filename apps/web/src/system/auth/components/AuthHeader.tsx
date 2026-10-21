// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { Flex, Stack, Text } from '@monolith/ui'

import MonolithLogo from '@/core/components/MonolithLogo'

export default function AuthHeader() {
  const { t } = useTranslation('common.auth')
  return (
    <Stack gap="md" align="center" mb="lg">
      <Flex align="center" gap="sm">
        <MonolithLogo size={36} />
        <Text size="xl" weight="semibold">
          monolith
        </Text>
      </Flex>
      <Text
        as="h1"
        size={{ base: '3xl', sm: '4xl' }}
        weight="semibold"
        align="center"
      >
        {t('header')}
      </Text>
      <Text as="p" size="lg" color="muted" align="center">
        {t('desc')}
      </Text>
    </Stack>
  )
}
