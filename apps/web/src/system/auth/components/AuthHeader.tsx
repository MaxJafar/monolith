import { useTranslation } from 'react-i18next'

import { Flex, Text } from '@lifeforge/ui'

import MonolithLogo from '@/core/components/MonolithLogo'

function AuthHeader() {
  const { t } = useTranslation('common.auth')

  return (
    <>
      <Flex asChild align="center" gap="sm" mb="lg">
        <Text as="h1" size="3xl" weight="semibold" whiteSpace="nowrap">
          <MonolithLogo size={40} />
          <Text tracking="tight">monolith</Text>
        </Text>
      </Flex>
      <Text
        align="center"
        as="h2"
        size={{ base: '4xl', sm: '5xl' }}
        tracking="tight"
        weight="semibold"
      >
        {t('header')}
      </Text>
      <Text
        align="center"
        as="p"
        color="muted"
        mt={{ base: 'sm', sm: 'md' }}
        size={{ base: 'base', sm: 'xl' }}
      >
        {t('desc')}
      </Text>
    </>
  )
}

export default AuthHeader
