import { Trans, useTranslation } from 'react-i18next'

import { Flex, Icon, Stack, Text } from '@lifeforge/ui'

function AuthFooter() {
  const { t } = useTranslation('common.auth')

  return (
    <Stack centered as="footer" mt="xl">
      <Flex centered gap="sm">
        {[
          'creative-commons',
          'creative-commons-by',
          'creative-commons-nc',
          'creative-commons-sa'
        ].map(icon => (
          <Icon key={icon} color="muted" icon={`tabler:${icon}`} size="1.5em" />
        ))}
      </Flex>
      <Text align="center" color="muted" size="sm">
        {t('forkAttribution')}
      </Text>
      <Text align="center" color="muted" size="sm">
        <Trans
          components={{
            author: (
              <Text
                as="a"
                color="primary"
                href="https://melvinchia.dev"
                rel="noreferrer"
                style={{
                  textDecoration: 'underline'
                }}
                target="_blank"
              />
            ),
            license: (
              <Text
                as="a"
                color="primary"
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                rel="noreferrer"
                style={{
                  textDecoration: 'underline'
                }}
                target="_blank"
              />
            )
          }}
          i18nKey="licenseAttribution"
          ns="common.auth"
        />
      </Text>
    </Stack>
  )
}

export default AuthFooter
