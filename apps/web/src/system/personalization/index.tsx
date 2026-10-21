// SPDX-License-Identifier: 0BSD
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Card,
  ColorInput,
  Flex,
  Listbox,
  ListboxOption,
  ModuleHeader,
  SliderInput,
  Stack,
  Switch,
  Text,
  WithQuery,
  usePersonalization
} from '@monolith/ui'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'
import workspaceAPI from '@/core/utils/workspaceAPI'

import BackgroundSettings from './BackgroundSettings'
import FontSettings from './FontSettings'
import './settings.css'
import { accents, displayToken, surfaces } from './settingsModel'

const ns = 'common.personalization'
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex align="center" justify="between" gap="lg" wrap="wrap" py="md">
      <Text weight="medium">{label}</Text>
      <div className="monolith-preference-control">{children}</div>
    </Flex>
  )
}
function Scale() {
  const ui = usePersonalization(),
    save = useUserPersonalization()
  const [draft, setDraft] = useState(ui.fontScale)
  const { t } = useTranslation(ns)
  useEffect(() => setDraft(ui.fontScale), [ui.fontScale])
  return (
    <Flex align="center" gap="sm">
      <SliderInput
        namespace={ns}
        label="monolith.scale"
        min={0.5}
        max={2}
        step={0.1}
        value={draft}
        onChange={setDraft}
        renderValue={v => Math.round(v * 100) + '%'}
      />
      <Button
        disabled={draft === ui.fontScale}
        onClick={() => save.changeFontScale(draft)}
      >
        {t('monolith.save')}
      </Button>
    </Flex>
  )
}
export default function Personalization() {
  const ui = usePersonalization(),
    save = useUserPersonalization(),
    appearance = useAppAppearance()
  const { t } = useTranslation(ns)
  const languages = useQuery(workspaceAPI.locales.listLanguages.queryOptions())
  const missing = useQuery(
    workspaceAPI.locales.listUnsupportedModules.queryOptions({
      queryKey: [
        ...workspaceAPI.locales.listUnsupportedModules.key,
        ui.language
      ]
    })
  )
  return (
    <Stack gap="lg" pb="xl">
      <ModuleHeader namespace={ns} />
      <Card>
        <Stack gap="md">
          <Text as="h2" size="xl" weight="semibold">
            {t('monolith.workspace')}
          </Text>
          <Text color="muted">{t('monolith.workspaceHelp')}</Text>
          <Flex gap="sm" wrap="wrap">
            <Button
              namespace={ns}
              icon="tabler:palette"
              onClick={() => appearance.openEditor('global')}
            >
              monolith.appStyle
            </Button>
            <Button
              namespace={ns}
              variant="secondary"
              onClick={() => appearance.openEditor('workspace')}
            >
              monolith.workspaceStyle
            </Button>
          </Flex>
        </Stack>
      </Card>
      <Card>
        <Row label={t('monolith.language')}>
          <WithQuery query={languages}>
            {items => (
              <Listbox
                aria-label={t('monolith.language')}
                value={ui.language}
                renderContent={value =>
                  items.find(item => item.name === value)?.displayName ?? value
                }
                minWidth="10rem"
                onChange={save.changeLanguage}
              >
                {items.map(item => (
                  <ListboxOption
                    key={item.name}
                    value={item.name}
                    icon={item.icon}
                    label={item.displayName}
                  />
                ))}
              </Listbox>
            )}
          </WithQuery>
        </Row>
        {!!missing.data?.length && (
          <Text color="muted" size="sm">
            {t('monolith.untranslated')} {missing.data.join(', ')}
          </Text>
        )}
        <Row label={t('monolith.theme')}>
          <div className="monolith-theme-choices">
            {(['light', 'dark', 'system'] as const).map(mode => (
              <button
                key={mode}
                className="monolith-theme-choice"
                data-mode={mode}
                aria-pressed={ui.theme === mode}
                onClick={() => save.changeTheme(mode)}
              >
                <span className="monolith-theme-sample">
                  <span />
                  <i />
                  <i />
                  <i />
                </span>
                <span>{t('monolith.' + mode)}</span>
              </button>
            ))}
          </div>
        </Row>
        <Row label={t('monolith.accent')}>
          <Flex gap="sm" align="center">
            <Listbox
              aria-label={t('monolith.accent')}
              value={ui.rawThemeColor}
              minWidth="7rem"
              renderContent={value =>
                value.startsWith('#')
                  ? t('monolith.custom')
                  : displayToken(value.replace(/^theme-/, ''))
              }
              onChange={save.changeThemeColor}
            >
              {accents.map(color => (
                <ListboxOption
                  key={color}
                  value={'theme-' + color}
                  label={displayToken(color)}
                />
              ))}
              {ui.rawThemeColor.startsWith('#') && (
                <ListboxOption
                  value={ui.rawThemeColor}
                  label={t('monolith.custom')}
                />
              )}
            </Listbox>
            <ColorInput
              namespace={ns}
              label="monolith.custom"
              variant="plain"
              value={ui.derivedThemeColor}
              onChange={save.changeThemeColor}
            />
          </Flex>
        </Row>
        <Row label={t('monolith.surface')}>
          <Flex gap="sm" align="center">
            <Listbox
              aria-label={t('monolith.surface')}
              value={ui.bgTemp}
              minWidth="7rem"
              renderContent={value =>
                value.startsWith('#')
                  ? t('monolith.custom')
                  : displayToken(value.replace(/^bg-/, ''))
              }
              onChange={save.changeBgTemp}
            >
              {surfaces.map(color => (
                <ListboxOption
                  key={color}
                  value={'bg-' + color}
                  label={displayToken(color)}
                />
              ))}
              {ui.bgTemp.startsWith('#') && (
                <ListboxOption value={ui.bgTemp} label={t('monolith.custom')} />
              )}
            </Listbox>
            <ColorInput
              namespace={ns}
              label="monolith.custom"
              variant="plain"
              value={
                ui.bgTemp.startsWith('#')
                  ? ui.bgTemp
                  : (ui.bgTempPalette[500] ?? '#737373')
              }
              onChange={save.changeBgTemp}
            />
          </Flex>
        </Row>
        <Row label={t('monolith.scale')}>
          <Scale />
        </Row>
        <Row label={t('monolith.corners')}>
          <Listbox
            aria-label={t('monolith.corners')}
            value={ui.borderRadiusMultiplier}
            renderContent={value =>
              value === 0
                ? t('monolith.square')
                : value === 1
                  ? t('monolith.standard')
                  : String(value) + '×'
            }
            minWidth="10rem"
            onChange={save.changeBorderRadiusMultiplier}
          >
            {[0, 0.5, 1, 2, 3, 3.6].map(value => (
              <ListboxOption
                key={value}
                value={value}
                label={
                  value === 0
                    ? t('monolith.square')
                    : value === 1
                      ? t('monolith.standard')
                      : String(value) + '×'
                }
              />
            ))}
          </Listbox>
        </Row>
        <Row label={t('monolith.borders')}>
          <Switch
            aria-label={t('monolith.borders')}
            value={ui.bordered}
            onChange={save.changeBordered}
          />
        </Row>
      </Card>
      <BackgroundSettings />
      <FontSettings />
    </Stack>
  )
}
