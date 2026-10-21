// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { Button, Stack, Text } from '@monolith/ui'

export default function Documentation() {
  const { t } = useTranslation('common.documentation')
  return (
    <Stack gap="lg" p="lg" maxWidth="48rem">
      <Text as="h1" size="3xl" weight="semibold">
        {t('title')}
      </Text>
      <Text as="p" color="muted">
        {t('description')}
      </Text>
      <Button
        as="a"
        href="https://monolith-site-maxjafars-projects.vercel.app/docs"
        target="_blank"
        rel="noopener noreferrer"
        namespace={false}
        icon="tabler:book"
      >
        Monolith documentation
      </Button>
      <Button
        as="a"
        href="https://github.com/MaxJafar/monolith"
        target="_blank"
        rel="noopener noreferrer"
        namespace={false}
        variant="secondary"
        icon="tabler:brand-github"
      >
        Monolith on GitHub
      </Button>
    </Stack>
  )
}
