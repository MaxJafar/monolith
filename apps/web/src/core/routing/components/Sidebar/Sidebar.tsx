import {
  Box,
  Button,
  Flex,
  Stack,
  elasticScrollEdge,
  useMainSidebarState
} from '@monolith/ui'
import { type CSSProperties, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import SidebarCharacter from '@/addons/urpg/SidebarCharacter'
import { useSettingsOverlay } from '@/core/overlays/SettingsOverlay'
import WorkspaceUtilities from '@/core/overlays/WorkspaceUtilities'
import { sidebarShouldCloseOnEscape } from '@/core/routing/utils/navigation'

import NavigationTree from './NavigationTree'
import SidebarBottomBar from './SidebarBottomBar'
import SidebarEventBanner from './SidebarEventBanner'
import SidebarFavorites from './SidebarFavorites'
import SidebarHeader from './SidebarHeader'
import { useSidebarPreferences } from './SidebarPreferences'
import SidebarResize from './SidebarResize'
import './sidebar.css'

function Sidebar() {
  const { t } = useTranslation('common.appBar')
  const { sidebarExpanded, toggleSidebar } = useMainSidebarState()
  const location = useLocation()
  const { t: ui } = useTranslation('common.workspaceUI')
  const settings = useSettingsOverlay()
  const { preferences } = useSidebarPreferences()

  const route = `${location.pathname}${location.search}`

  const previousRoute = useRef(route)
  const sidebarRef = useRef<HTMLElement>(null)
  const previouslyExpanded = useRef(sidebarExpanded)

  useEffect(() => {
    const opened = sidebarExpanded && !previouslyExpanded.current
    previouslyExpanded.current = sidebarExpanded
    const sidebar = sidebarRef.current

    if (!opened || !sidebar || window.innerWidth > 1000) return

    const previousFocus = document.activeElement
    const focusDrawer = () => {
      if (!sidebar.contains(document.activeElement))
        sidebar
          .querySelector<HTMLElement>('button:not([disabled]),a[href],input')
          ?.focus({ preventScroll: true })
    }
    const frame = requestAnimationFrame(focusDrawer)
    sidebar.addEventListener('transitionend', focusDrawer, { once: true })

    return () => {
      cancelAnimationFrame(frame)
      sidebar.removeEventListener('transitionend', focusDrawer)
      if (
        document.activeElement !== document.body &&
        !sidebar.contains(document.activeElement)
      )
        return

      const opener =
        previousFocus instanceof HTMLButtonElement &&
        previousFocus.getAttribute('aria-controls') ===
          'workspace-navigation' &&
        previousFocus.getClientRects().length > 0
          ? previousFocus
          : Array.from(
              document.querySelectorAll<HTMLButtonElement>(
                'button[aria-controls="workspace-navigation"]'
              )
            ).find(button => button.getClientRects().length > 0)
      opener?.focus({ preventScroll: true })
    }
  }, [sidebarExpanded])

  useEffect(() => {
    if (
      previousRoute.current !== route &&
      sidebarExpanded &&
      window.innerWidth <= 1000
    )
      toggleSidebar()
    previousRoute.current = route
  }, [route, sidebarExpanded, toggleSidebar])

  return (
    <>
      <Box
        aria-hidden={!sidebarExpanded}
        aria-label={t('closeSidebar')}
        as="button"
        className="monolith-sidebar-backdrop"
        data-expanded={sidebarExpanded}
        inert={!sidebarExpanded}
        tabIndex={-1}
        type="button"
        onClick={toggleSidebar}
      />
      <Flex
        ref={sidebarRef}
        aria-hidden={!sidebarExpanded}
        as="aside"
        bg={{ base: 'bg-50', dark: 'bg-900' }}
        className="zillion-main-sidebar"
        data-compact={preferences.compact}
        data-expanded={sidebarExpanded}
        direction="column"
        flexShrink="0"
        height="100%"
        id="workspace-navigation"
        inert={!sidebarExpanded}
        left="0"
        minWidth="0"
        overflow="hidden"
        position="relative"
        r="none"
        style={{ '--sidebar-width': `${preferences.width}px` } as CSSProperties}
        top="0"
        width="min(100%, 264px)"
        zIndex="99"
        onKeyDown={event => {
          // Portalled utility popovers handle their own Escape and Tab keys.
          if (!event.currentTarget.contains(event.target as Node)) return
          if (event.key === 'Tab' && window.innerWidth <= 1000) {
            const controls = Array.from(
              sidebarRef.current?.querySelectorAll<HTMLElement>(
                'input,select,textarea,button,a[href],[tabindex="0"]'
              ) ?? []
            ).filter(
              element =>
                element.getClientRects().length > 0 &&
                !element.closest('[inert]') &&
                !element.hasAttribute('disabled')
            )
            const first = controls[0],
              last = controls[controls.length - 1]

            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }

          if (
            sidebarShouldCloseOnEscape(event.nativeEvent, sidebarExpanded, window.innerWidth)
          ) {
            event.preventDefault()
            toggleSidebar()
          }
        }}
      >
        <SidebarEventBanner />
        <SidebarHeader />
        <SidebarCharacter />
        <Box
          className="monolith-sidebar-scroll"
          flex="1"
          minHeight="0"
          overflowX="hidden"
          overflowY="auto"
          pb="md"
          onWheel={event =>
            elasticScrollEdge(event.currentTarget, event.nativeEvent)
          }
        >
          <Stack gap="none">
            <SidebarFavorites />
            <NavigationTree />
          </Stack>
        </Box>
        <Stack className="monolith-sidebar-utilities" gap="none" px="sm">
          <WorkspaceUtilities />
          <Button
            icon="lucide:sliders-horizontal"
            justify="start"
            namespace={false}
            variant="plain"
            onClick={() => settings('sidebar')}
          >
            {ui('customizeSidebar')}
          </Button>
          <Flex gap="xs">
            <Button
              flex="1"
              icon="lucide:settings"
              justify="start"
              namespace={false}
              variant="plain"
              onClick={() => settings()}
            >
              {ui('settings')}
            </Button>
            <Button
              flex="1"
              icon="lucide:archive"
              justify="start"
              namespace={false}
              variant="plain"
              onClick={() => settings('archive')}
            >
              {ui('archive')}
            </Button>
          </Flex>
        </Stack>
        <SidebarBottomBar />
        <SidebarResize sidebar={sidebarRef} />
      </Flex>
    </>
  )
}

export default Sidebar
