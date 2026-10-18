import { getNativeRuntime } from '@monolith/api'
import type { Appearance } from '@monolith/blocks'
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Text,
  useAppearance,
  useCoverPicker,
  usePageChrome,
  usePersonalization
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationContext'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { useWorkspaceTabs } from './WorkspaceTabs'

export default function PageActions() {
  const { t } = useTranslation('common.chrome')
  const { t: common } = useTranslation('common')

  const appearance = useAppAppearance(),
    { appearance: resolved } = useAppearance()
  const { derivedTheme } = usePersonalization(),
    { changeTheme } = useUserPersonalization()
  const chrome = usePageChrome(),
    tabs = useWorkspaceTabs(),
    location = useLocation()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false)
  const native = getNativeRuntime()
  const { active } = useWorkspace()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const pageId = location.pathname.match(/^\/page\/([0-9a-f-]{36})$/i)?.[1]
  const atlasFocus = pageId
    ? `document:${pageId}`
    : params.get('record')
      ? `record:${params.get('record')}`
      : params.get('base')
        ? `database:${params.get('base')}`
        : null
  const pickCover = useCoverPicker()

  async function update(patch: Partial<Appearance>) {
    if (busy || !appearance.canEdit) return
    setBusy(true)
    setError('')

    try {
      await appearance.save(
        'page',
        { ...appearance.pages[appearance.pageKey], ...patch },
        appearance.workspaceRevision
      )
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    setError('')
    const text = `${native?.profile.origin ?? window.location.origin}${location.pathname}${location.search}${location.hash}`

    try {
      // HTTP previews and some native origins do not expose the Clipboard API.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(text)
      else {
        const field = document.createElement('textarea')
        field.value = text
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.append(field)
        field.select()

        try {
          if (!document.execCommand('copy')) throw Error(t('copyFailed'))
        } finally {
          field.remove()
        }
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('copyFailed'))
    }
  }

  return (
    <Flex align="center" gap="xs">
      {chrome?.document && (
        <Text
          className="monolith-save-status"
          color="muted"
          role="status"
          size="xs"
        >
          {chrome.document.status}
        </Text>
      )}
      <Button
        aria-label={t(copied ? 'copied' : 'copyLink')}
        className="monolith-chrome-button"
        icon={copied ? 'lucide:check' : 'lucide:link'}
        namespace={false}
        variant="plain"
        onClick={() => void copyLink()}
      />
      <Button
        aria-label={common('documentEditor.undo')}
        className="monolith-chrome-button"
        disabled={!chrome?.undo}
        icon="lucide:undo-2"
        namespace={false}
        title={common('documentEditor.undo')}
        variant="plain"
        onClick={() => chrome?.undo?.()}
      />
      <ContextMenu
        componentProps={{
          button: {
            icon: 'lucide:ellipsis',
            'aria-label': t('pageSettings'),
            className: 'monolith-chrome-button'
          },
          menu: { className: 'monolith-page-menu', minWidth: '280px' }
        }}
      >
        <ContextMenuItem
          icon="lucide:image"
          namespace={false}
          label={common('appearance.changeCover')}
          disabled={!appearance.canEdit}
          onClick={() =>
            pickCover(resolved.cover, async cover => {
              await appearance.save(
                'page',
                { ...appearance.pages[appearance.pageKey], cover },
                appearance.workspaceRevision
              )
            })
          }
        />
        <Text color="muted" pb="xs" pt="sm" px="md" size="xs">
          {t('fontStyle')}
        </Text>
        <Flex aria-label={t('fontStyle')} gap="xs" pb="sm" px="sm" role="group">
          {(['system-ui', 'serif', 'monospace'] as const).map(
            (family, index) => (
              <Button
                key={family}
                aria-pressed={(resolved.font?.family ?? 'system-ui') === family}
                className={`monolith-font-choice monolith-font-${index}`}
                disabled={busy || !appearance.canEdit}
                namespace={false}
                variant="plain"
                onClick={() =>
                  void update({ font: { provider: 'system', family } })
                }
              >
                <Text as="span" size="xl">
                  Ag
                </Text>
                <Text as="span" size="xs">
                  {t(['defaultFont', 'serifFont', 'monoFont'][index]!)}
                </Text>
              </Button>
            )
          )}
        </Flex>
        <ContextMenuItem
          checked={resolved.contentWidth === 'full'}
          disabled={busy || !appearance.canEdit}
          icon="lucide:arrow-left-right"
          label={t('fullWidth')}
          namespace={false}
          shouldCloseMenuOnClick={false}
          onClick={() =>
            void update({
              contentWidth:
                resolved.contentWidth === 'full' ? 'standard' : 'full'
            })
          }
        />
        <ContextMenuItem
          icon="lucide:sliders-horizontal"
          label={t('appearance')}
          namespace={false}
          onClick={() => appearance.openEditor('page')}
        />
        <Box className="monolith-menu-divider" />
        <ContextMenuItem
          icon="lucide:link"
          label={t('copyLink')}
          namespace={false}
          onClick={() => void copyLink()}
        />
        <ContextMenuItem
          icon="lucide:panel-top"
          label={t('openTab')}
          namespace={false}
          onClick={() =>
            tabs.open(location.pathname + location.search + location.hash)
          }
        />
        {chrome?.document?.exportMarkdown && (
          <ContextMenuItem
            icon="lucide:download"
            label={common('documentEditor.exportMarkdown')}
            namespace={false}
            onClick={chrome.document.exportMarkdown}
          />
        )}
        {atlasFocus && active?.enabled_modules.includes('atlas') && (
          <ContextMenuItem
            icon="lucide:orbit"
            label={t('viewInAtlas')}
            namespace={false}
            onClick={() =>
              navigate(
                `/atlas?${new URLSearchParams({ workspace: active.id, focus: atlasFocus, scope: 'local' })}`
              )
            }
          />
        )}
        <Box className="monolith-menu-divider" />
        <ContextMenuItem
          icon={derivedTheme === 'dark' ? 'lucide:sun' : 'lucide:moon'}
          label={common(
            `appBar.${derivedTheme === 'dark' ? 'lightTheme' : 'darkTheme'}`
          )}
          namespace={false}
          onClick={() =>
            void changeTheme(derivedTheme === 'dark' ? 'light' : 'dark')
          }
        />
        {native && (
          <ContextMenuItem
            icon="lucide:cloud-check"
            label={common('desktop.connection')}
            namespace={false}
            onClick={() =>
              window.dispatchEvent(new Event('monolith-show-connection'))
            }
          />
        )}
        {error && (
          <Text px="md" py="sm" role="alert" size="xs">
            {error}
          </Text>
        )}
      </ContextMenu>
      {error && (
        <Text className="monolith-page-action-error" role="alert" size="xs">
          {error}
        </Text>
      )}
    </Flex>
  )
}
