import { type NativeHost, getNativeRuntime } from '@monolith/api'
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useMainSidebarState
} from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import MonolithLogo from '@/core/components/MonolithLogo'
import { useSearchOverlay } from '@/core/overlays/SearchOverlay'

import { useWorkspaceTabs } from './WorkspaceTabs'
import './workspaceChrome.css'

export function WindowControls({ host }: { host: NativeHost }) {
  const { t } = useTranslation('common.chrome')
  const [maximized, setMaximized] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const update = () => {
      void host
        .windowControl?.('state')
        .then(state => setMaximized(state.maximized))
        .catch(() => {})
    }
    update()
    window.addEventListener('resize', update)

    return () => window.removeEventListener('resize', update)
  }, [host])
  if (host.platform !== 'windows') return null

  return (
    <Flex align="stretch" className="monolith-window-controls" flexShrink="0">
      {(['minimize', 'maximize', 'close'] as const).map(action => (
        <Button
          key={action}
          aria-label={t(
            action === 'maximize' && maximized ? 'restore' : action
          )}
          className={`monolith-caption-button monolith-caption-${action}`}
          icon={
            action === 'minimize'
              ? 'lucide:minus'
              : action === 'close'
                ? 'lucide:x'
                : maximized
                  ? 'lucide:copy'
                  : 'lucide:square'
          }
          namespace={false}
          variant="plain"
          onClick={() =>
            void host
              .windowControl?.(action)
              .then(state => setMaximized(state.maximized))
              .catch(cause => setError(String(cause)))
          }
        />
      ))}
      {error && <Text role="alert">{error}</Text>}
    </Flex>
  )
}

export function ChromeBrand() {
  return (
    <Flex
      align="center"
      className="monolith-chrome-brand"
      flexShrink="0"
      gap="sm"
    >
      <MonolithLogo size={18} />
      <Text size="sm" weight="semibold">
        monolith
      </Text>
    </Flex>
  )
}

export default function WorkspaceChrome() {
  const { t } = useTranslation('common.chrome')
  const tabs = useWorkspaceTabs()
  const openSearch = useSearchOverlay()
  const { sidebarExpanded, toggleSidebar } = useMainSidebarState()

  const native = getNativeRuntime()?.host

  const navigate = useNavigate()
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tabs.active, tabs.tabs.length])
  useEffect(() => {
    const openLink = (event: MouseEvent) => {
      if (
        !(
          event.button === 1 ||
          (event.button === 0 && (event.metaKey || event.ctrlKey))
        ) ||
        event.defaultPrevented
      )
        return

      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null
      const target = anchor?.getAttribute('href')

      if (
        !target?.startsWith('/') ||
        target.startsWith('//') ||
        anchor?.download
      )
        return
      event.preventDefault()
      event.stopPropagation()
      tabs.open(target)
    }
    document.addEventListener('click', openLink, true)
    document.addEventListener('auxclick', openLink, true)

    return () => {
      document.removeEventListener('click', openLink, true)
      document.removeEventListener('auxclick', openLink, true)
    }
  }, [tabs])

  return (
    <Flex
      align="center"
      as="header"
      className="monolith-workspace-chrome"
      data-platform={native?.platform ?? 'web'}
      flexShrink="0"
      gap="xs"
      onDoubleClick={event => {
        if (
          native &&
          event.target instanceof Element &&
          !event.target.closest('button,a,[role="tab"]')
        )
          void native.windowControl?.('maximize').catch(() => {})
      }}
      onMouseDown={event => {
        if (
          event.button === 0 &&
          native &&
          event.target instanceof Element &&
          !event.target.closest('button,a,[role="tab"]')
        )
          void native.windowControl?.('drag').catch(() => {})
      }}
    >
      <ChromeBrand />
      <Button
        aria-controls="workspace-navigation"
        aria-expanded={sidebarExpanded}
        aria-label={t(sidebarExpanded ? 'closeSidebar' : 'openSidebar')}
        className="monolith-chrome-button"
        icon="lucide:panel-left"
        namespace={false}
        variant="plain"
        onClick={toggleSidebar}
      />
      <Flex className="monolith-history-controls" gap="none">
        <Button
          aria-label={t('back')}
          className="monolith-chrome-button"
          icon="lucide:chevron-left"
          namespace={false}
          variant="plain"
          onClick={() => void navigate(-1)}
        />
        <Button
          aria-label={t('forward')}
          className="monolith-chrome-button"
          icon="lucide:chevron-right"
          namespace={false}
          variant="plain"
          onClick={() => void navigate(1)}
        />
      </Flex>
      <Flex
        ref={list}
        align="stretch"
        aria-label={t('tabs')}
        className="monolith-workspace-tabs"
        minWidth="0"
        role="tablist"
        onKeyDown={event => {
          if (
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) ||
            (event.target as HTMLElement).getAttribute('role') !== 'tab'
          )
            return
          event.preventDefault()
          const index = tabs.tabs.findIndex(tab => tab.id === tabs.active)
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.tabs.length - 1
                : (index +
                    (event.key === 'ArrowRight' ? 1 : -1) +
                    tabs.tabs.length) %
                  tabs.tabs.length
          tabs.select(tabs.tabs[next]!.id)
          const targets =
            list.current?.querySelectorAll<HTMLElement>('[role="tab"]')
          targets?.[next]?.focus()
        }}
      >
        {tabs.tabs.map(tab => (
          <Flex
            key={tab.id}
            align="center"
            className="monolith-workspace-tab"
            data-active={tab.id === tabs.active}
          >
            <Box
              aria-controls="workspace-tab-panel"
              aria-selected={tab.id === tabs.active}
              as="button"
              className="monolith-tab-target"
              id={`tab-${tab.id}`}
              role="tab"
              tabIndex={tab.id === tabs.active ? 0 : -1}
              title={tab.title || t('newTab')}
              onAuxClick={event => {
                if (event.button === 1) {
                  event.preventDefault()
                  tabs.close(tab.id)
                }
              }}
              onClick={() => tabs.select(tab.id)}
            >
              <Icon icon={tab.icon} size="14px" />
              <Text truncate size="sm">
                {tab.title || t('newTab')}
              </Text>
            </Box>
            {tabs.tabs.length > 1 && (
              <Button
                aria-label={t('closeTab', { name: tab.title || t('newTab') })}
                className="monolith-tab-close"
                icon="lucide:x"
                namespace={false}
                variant="plain"
                onClick={() => tabs.close(tab.id)}
              />
            )}
          </Flex>
        ))}
      </Flex>
      <Button
        aria-label={t('newTab')}
        className="monolith-chrome-button"
        disabled={tabs.tabs.length >= 30}
        icon="lucide:plus"
        namespace={false}
        variant="plain"
        onClick={() => openSearch(true)}
      />
      <Box flex="1" height="100%" minWidth="8px" />
      {native && <WindowControls host={native} />}
    </Flex>
  )
}
