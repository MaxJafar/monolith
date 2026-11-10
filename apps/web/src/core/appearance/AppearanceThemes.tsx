import { useTranslation } from 'react-i18next'

import { type Appearance, selectAppearanceTheme } from '@monolith/blocks'
import {
  Box,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
  appearanceVariables,
  usePersonalization
} from '@monolith/ui'

const themes = ['monolith', 'max-jafarov'] as const

export function AppearanceThemes({
  value,
  onChange
}: {
  value: Appearance['themePreset']
  onChange: (patch: Partial<Appearance>) => void
}) {
  const { t } = useTranslation('common.appearance')
  const { derivedTheme } = usePersonalization()
  return (
    <Stack gap="sm">
      <Text as="h3" weight="semibold">
        {t('themes.title')}
      </Text>
      <Text color="muted" size="sm">
        {t('themes.help')}
      </Text>
      <Grid gap="sm" templateCols={{ base: 1, sm: 2 }}>
        {themes.map(themePreset => (
          <Button
            key={themePreset}
            aria-pressed={value === themePreset}
            className="appearance-theme-option"
            namespace={false}
            variant="secondary"
            direction="column"
            align="stretch"
            gap="md"
            p="md"
            r="lg"
            onClick={() => onChange(selectAppearanceTheme(themePreset))}
          >
            <Flex
              aria-hidden="true"
              className="appearance-theme-sample"
              align="center"
              gap="sm"
              p="md"
              r="lg"
              style={appearanceVariables({ themePreset }, derivedTheme)}
            >
              <Box
                width="8px"
                height="36px"
                r="sm"
                style={{ background: 'var(--accent-primary)' }}
              />
              <Stack gap="xs" flex="1">
                <Box
                  width="70%"
                  height="6px"
                  r="full"
                  style={{ background: 'var(--text-primary)' }}
                />
                <Box
                  width="45%"
                  height="6px"
                  r="full"
                  style={{ background: 'var(--text-muted)' }}
                />
              </Stack>
              <Box
                width="32px"
                height="22px"
                r="full"
                style={{ background: 'var(--md-sys-color-primary-container)' }}
              />
            </Flex>
            <Text weight="semibold">{t(`themes.${themePreset}`)}</Text>
          </Button>
        ))}
      </Grid>
      <Button
        namespace={false}
        variant="plain"
        onClick={() => onChange(selectAppearanceTheme(undefined))}
      >
        {t('themes.inherit')}
      </Button>
    </Stack>
  )
}
