import { useTranslation } from 'react-i18next'

import type { Appearance } from '@monolith/blocks'
import {
  AppearanceContext,
  AppearanceCover,
  Box,
  Button,
  Flex,
  Icon,
  Stack,
  Text,
  appearanceVariables,
  usePersonalization
} from '@monolith/ui'

import { AppearanceFont } from './AppearanceFont'

export function AppearancePreview({ appearance }: { appearance: Appearance }) {
  const { t } = useTranslation('common.appearance')
  const { derivedTheme } = usePersonalization()

  return (
    <AppearanceContext value={{ appearance }}>
      <Stack
        className="appearance-preview appearance-surface"
        gap="md"
        p="md"
        r="lg"
        style={appearanceVariables(appearance, derivedTheme)}
      >
        <AppearanceFont font={appearance.font} />
        <Text as="h3" color="muted" size="sm">
          {t('preview')}
        </Text>
        <AppearanceCover />
        <Flex align="center" gap="sm">
          <Icon
            color="primary"
            icon={appearance.icon ?? 'lucide:file-text'}
            preserveStyle={!!appearance.icon}
            size="28px"
          />
          <Text as="h3" size="xl" weight="semibold">
            {t('previewTitle')}
          </Text>
        </Flex>
        <Text as="p" size="sm">
          {t('previewBody')}
        </Text>
        <Flex align="center" gap="sm">
          <Icon icon="lucide:calendar-days" />
          <Icon icon="lucide:folder" />
          <Icon icon="lucide:database" />
          <Text color="primary" size="sm">
            {t('previewAccent')}
          </Text>
        </Flex>
        <Box p="md" r="md" style={{ background: 'var(--bg-lifted)' }}>
          <Text size="sm">{t('previewCard')}</Text>
        </Box>
        <Button namespace={false} onClick={() => undefined}>
          {t('previewButton')}
        </Button>
      </Stack>
    </AppearanceContext>
  )
}
