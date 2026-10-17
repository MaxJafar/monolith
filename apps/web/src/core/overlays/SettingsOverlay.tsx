import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  Stack,
  Switch,
  Text,
  useModalStore,
  usePageOpenPreference,
  usePersonalization
} from '@monolith/ui'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationContext'
import { useNavigation } from '@/core/routing/components/Sidebar/NavigationProvider'
import { useSidebarPreferences } from '@/core/routing/components/Sidebar/SidebarPreferences'
import SystemSearchPage from '@/core/search/SystemSearchPage'
import { UpdateSettings } from '@/core/updates/UpdatesProvider'
import AccountAndSecurityTab from '@/system/accountSettings/tabs/AccountAndSecurityTab'
import PersonalInfoTab from '@/system/accountSettings/tabs/PersonalInfoTab'

import NativeSectionSettings from './NativeSectionSettings'
import WidgetSettings from './WidgetSettings'
import { WorkspaceSettingsPanel } from './WorkspaceSettingsPanel'
import './overlays.css'
import { useOverlayFocus } from './useOverlayFocus'

export type SettingsSection =
  | 'general'
  | 'preferences'
  | 'sidebar'
  | 'widgets'
  | 'addons'
  | 'updates'
  | 'account'
  | 'security'
  | 'archive'
  | 'search'

const sections = {
  general: 'lucide:layers',
  preferences: 'lucide:sliders-horizontal',
  sidebar: 'lucide:panel-left',
  widgets: 'lucide:layout-grid',
  addons: 'lucide:puzzle',
  updates: 'lucide:download',
  account: 'lucide:user',
  security: 'lucide:shield-check',
  archive: 'lucide:archive',
  search: 'lucide:search'
} as const

export function useSettingsOverlay() {
  const { open, stack } = useModalStore()

  return (section: SettingsSection = 'preferences') => {
    if (
      !stack.some(item => item.component === SettingsOverlay && !item.isClosing)
    )
      open(SettingsOverlay, { section })
  }
}

function SettingRow({
  title,
  help,
  children
}: {
  title: string
  help?: string
  children: ReactNode
}) {
  return (
    <Flex
      align="center"
      className="workspace-setting-row"
      gap="lg"
      justify="between"
    >
      <Stack gap="xs" minWidth="0">
        <Text weight="medium">{title}</Text>
        {help && (
          <Text color="muted" size="sm">
            {help}
          </Text>
        )}
      </Stack>
      {children}
    </Flex>
  )
}

export default function SettingsOverlay({
  data,
  onClose
}: {
  data: { section: SettingsSection }
  onClose: () => void
}) {
  const { t } = useTranslation('common.workspaceUI')
  const [section, setSection] = useState(data.section)
  const [query, setQuery] = useState('')
  const ref = useOverlayFocus(onClose)
  const navigate = useNavigate()

  return (
    <Flex
      ref={ref}
      aria-label={t('settings')}
      aria-modal="true"
      className="workspace-settings"
      data-workspace-overlay="settings"
      role="dialog"
      tabIndex={-1}
    >
      <Stack
        aria-label={t('settings')}
        as="nav"
        className="workspace-settings-nav"
        gap="xs"
        p="md"
        width={undefined}
      >
        <Text mb="sm" size="sm" weight="semibold">
          {t('settings')}
        </Text>
        <Box
          data-autofocus
          aria-label={t('findSettings')}
          as="input"
          className="workspace-input"
          placeholder={t('findSettings')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Text color="muted" mb="xs" mt="md" size="xs">
          {t('workspace')}
        </Text>
        {(Object.keys(sections) as SettingsSection[])
          .filter(id => t(id).toLowerCase().includes(query.toLowerCase()))
          .map(id => (
            <Button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              className="workspace-settings-tab"
              icon={sections[id]}
              justify="start"
              namespace={false}
              variant="plain"
              onClick={() => setSection(id)}
            >
              {t(id)}
            </Button>
          ))}
        {query &&
          !(Object.keys(sections) as SettingsSection[]).some(id =>
            t(id).toLowerCase().includes(query.toLowerCase())
          ) && (
            <Text color="muted" size="sm">
              {t('noResults')}
            </Text>
          )}
        <Text className="workspace-settings-brand" color="muted" size="xs">
          monolith
        </Text>
      </Stack>
      <Stack
        className="workspace-settings-content"
        flex="1"
        gap="lg"
        minWidth="0"
        width={undefined}
      >
        <Flex align="center" gap="sm" justify="between">
          <Stack gap="xs">
            <Text as="h1" size="2xl" weight="semibold">
              {t(section)}
            </Text>
            <Text color="muted" size="sm">
              {t(`${section}Help`)}
            </Text>
          </Stack>
          <Button
            aria-label={t('close')}
            icon="lucide:x"
            namespace={false}
            variant="plain"
            onClick={onClose}
          />
        </Flex>
        <Stack key={section} gap="md" className="workspace-settings-section">
          {section === 'general' && <WorkspaceSettingsPanel />}
          {section === 'preferences' && <Preferences />}
          {section === 'sidebar' && <SidebarSettings />}
          {section === 'widgets' && <WidgetSettings />}
          {section === 'updates' && <UpdateSettings />}
          {section === 'addons' && (
            <Button
              namespace={false}
              variant="secondary"
              icon="lucide:puzzle"
              onClick={() => {
                onClose()
                navigate('/addons')
              }}
            >
              {t('addons')}
            </Button>
          )}
          {section === 'archive' && <Archive onClose={onClose} />}
          {section === 'account' && <PersonalInfoTab />}
          {section === 'security' && <AccountAndSecurityTab />}
          {section === 'search' && <SystemSearchPage />}
        </Stack>
      </Stack>
    </Flex>
  )
}

function Preferences() {
  const { t } = useTranslation('common.workspaceUI')
  const { theme, language } = usePersonalization()
  const { changeTheme, changeLanguage } = useUserPersonalization()
  const appearance = useAppAppearance()
  const [pageMode, setPageMode] = usePageOpenPreference()

  return (
    <Stack gap="none">
      <SettingRow title={t('openPages')} help={t('openPagesHelp')}>
        <ChoiceSelect
          label={t('openPages')}
          value={pageMode}
          options={(['side', 'overlay', 'full'] as const).map(value => ({
            value,
            label: t(`pageOpen.${value}`)
          }))}
          onChange={value => {
            if (value === 'side' || value === 'overlay' || value === 'full')
              setPageMode(value)
          }}
        />
      </SettingRow>
      <SettingRow help={t('themeHelp')} title={t('theme')}>
        <ChoiceSelect
          label={t('theme')}
          value={theme}
          onChange={value => {
            if (value === 'system' || value === 'dark' || value === 'light')
              void changeTheme(value)
          }}
          options={['system', 'light', 'dark'].map(value => ({
            value,
            label: t(value)
          }))}
        />
      </SettingRow>
      <SettingRow title={t('language')}>
        <ChoiceSelect
          label={t('language')}
          value={language}
          onChange={value => void changeLanguage(value)}
          options={[
            ['en', 'English'],
            ['ms', 'Bahasa Melayu'],
            ['zh-CN', '简体中文'],
            ['zh-TW', '繁體中文']
          ].map(([value, label]) => ({ value: value!, label: label! }))}
        />
      </SettingRow>
      <SettingRow help={t('appearanceHelp')} title={t('appearance')}>
        <Button
          icon="lucide:palette"
          namespace={false}
          variant="secondary"
          onClick={() => appearance.openEditor('global')}
        >
          {t('customize')}
        </Button>
      </SettingRow>
      <SettingRow title={t('workspaceAppearance')}>
        <Button
          disabled={!appearance.canEdit}
          namespace={false}
          variant="secondary"
          onClick={() => appearance.openEditor('workspace')}
        >
          {t('customize')}
        </Button>
      </SettingRow>
      <Text color="muted" mt="lg" size="sm">
        {t('motionHelp')}
      </Text>
    </Stack>
  )
}

function SidebarSettings() {
  const { t } = useTranslation('common.workspaceUI')
  const { preferences: p, update, error } = useSidebarPreferences()

  return (
    <Stack gap="md">
      <Text color="muted" size="xs">
        {t('devicePreferences')}
      </Text>
      <SettingRow help={`${p.width}px`} title={t('sidebarWidth')}>
        <Box
          aria-label={t('sidebarWidth')}
          as="input"
          max={420}
          min={220}
          step={4}
          type="range"
          value={p.width}
          onChange={e => update({ width: Number(e.target.value) })}
        />
      </SettingRow>
      <SettingRow title={t('compact')}>
        <Switch
          aria-label={t('compact')}
          value={p.compact}
          onChange={compact => update({ compact })}
        />
      </SettingRow>
      <NativeSectionSettings />
      {error && (
        <Text color="dangerous" role="alert">
          {t('storageError')}
        </Text>
      )}
    </Stack>
  )
}

function Archive({ onClose }: { onClose: () => void }) {
  const nav = useNavigation()
  const navigate = useNavigate()
  const { t } = useTranslation('common.workspaceUI')

  const archived = nav.items.filter(item =>
    nav.config.items.some(saved => saved.key === item.key && saved.archived)
  )

  return (
    <Stack gap="sm">
      {!archived.length && (
        <Stack align="center" className="workspace-empty" gap="sm" p="xl">
          <Icon icon="lucide:archive" size="32px" />
          <Text weight="medium">{t('archiveEmpty')}</Text>
          <Text color="muted" size="sm">
            {t('archiveEmptyHelp')}
          </Text>
        </Stack>
      )}
      {archived.map(item => (
        <Flex
          key={item.key}
          align="center"
          className="workspace-setting-row"
          gap="sm"
        >
          <Icon icon={item.icon} size="18px" />
          <Text truncate className="workspace-flex-label">
            {item.title}
          </Text>
          <Button
            namespace={false}
            variant="plain"
            onClick={() => {
              onClose()
              navigate(item.href)
            }}
          >
            {t('open')}
          </Button>
          <Button
            disabled={!nav.canEdit}
            namespace={false}
            variant="secondary"
            onClick={() => void nav.archive(item, false)}
          >
            {t('restore')}
          </Button>
        </Flex>
      ))}
      {nav.error && (
        <Text color="dangerous" role="alert">
          {nav.error}
        </Text>
      )}
    </Stack>
  )
}
