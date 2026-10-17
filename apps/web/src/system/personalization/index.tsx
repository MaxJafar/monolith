import { useTranslation } from 'react-i18next'

import { Box, Button, Flex, ModuleHeader, Stack, Text } from '@monolith/ui'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'

import BgImageSelector from './components/BgImageSelector'
import BgTempSelector from './components/BgTempSelector'
import BorderRadiusSelector from './components/BorderRadiusSelector'
import BorderedSelector from './components/BorderedSelector'
import FontFamilySelector from './components/FontFamilySelector'
import FontScaleSelector from './components/FontScaleSelector'
import LanguageSelector from './components/LanguageSelector'
import ThemeColorSelector from './components/ThemeColorSelector'
import ThemeSelector from './components/ThemeSelector'

function Personalization() {
  const { openEditor } = useAppAppearance()
  const { t } = useTranslation('common.appearance')
  return (
    <>
      <ModuleHeader namespace="common.personalization" />
      <Stack mb="xl">
        <Box style={{ background: 'var(--bg-lifted)' }} p="lg" r="lg">
          <Stack gap="sm">
            <Text as="h2" size="xl" weight="semibold">
              {t('title')}
            </Text>
            <Text color="muted">{t('description')}</Text>
            <Flex gap="sm" wrap="wrap">
              <Button
                namespace={false}
                icon="lucide:palette"
                onClick={() => openEditor('global')}
              >
                {t('scopes.global')}
              </Button>
              <Button
                namespace={false}
                variant="secondary"
                onClick={() => openEditor('workspace')}
              >
                {t('scopes.workspace')}
              </Button>
            </Flex>
          </Stack>
        </Box>
        <LanguageSelector />
        <ThemeSelector />
        <ThemeColorSelector />
        <BgTempSelector />
        <BgImageSelector />
        <FontFamilySelector />
        <FontScaleSelector />
        <BorderRadiusSelector />
        <BorderedSelector />
      </Stack>
    </>
  )
}

export default Personalization
