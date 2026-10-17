import { useTranslation } from 'react-i18next'

import { Flex, Text } from '@monolith/ui'

import MonolithLogo from '@/core/components/MonolithLogo'

function AuthSideImage() {
  const { t } = useTranslation('common.auth')

  return (
    <Flex
      bg={{ base: 'bg-100', dark: 'bg-900' }}
      direction="column"
      display={{ base: 'none', lg: 'flex' }}
      gap="xl"
      height="100%"
      justify="between"
      p="3xl"
      width="50%"
    >
      <Flex align="center" gap="md">
        <MonolithLogo size={40} />
        <Text size="xl" tracking="tight" weight="semibold">
          monolith
        </Text>
      </Flex>
      <Flex direction="column" gap="lg" maxWidth="34em">
        <Text as="h2" size="5xl" tracking="tight" weight="semibold">
          {t('sideImageDesc.part2')}
        </Text>
        <Text as="p" color="muted" size="xl">
          {t('sideImageDesc.part1')}
        </Text>
      </Flex>
      <Text color="muted">{t('workspaceNote')}</Text>
    </Flex>
  )
}

export default AuthSideImage
