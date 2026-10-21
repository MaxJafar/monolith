// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { Stack, Text } from '@monolith/ui'

import MonolithLogo from '@/core/components/MonolithLogo'

export default function AuthSideImage() {
  const { t } = useTranslation('common.auth')
  return (
    <Stack
      as="aside"
      display={{ base: 'none', lg: 'flex' }}
      width="50%"
      height="100%"
      p="3xl"
      gap="xl"
      justify="center"
      bg={{ base: 'bg-100', dark: 'bg-900' }}
    >
      <MonolithLogo size={64} />
      <Text as="h2" size="4xl" weight="semibold">
        {t('sideImageDesc.part2')}
      </Text>
      <Text as="p" size="xl" color="muted">
        {t('sideImageDesc.part1')}
      </Text>
      <Text size="sm" color="muted">
        {t('workspaceNote')}
      </Text>
    </Stack>
  )
}
