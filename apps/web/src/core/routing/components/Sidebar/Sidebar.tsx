import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { Box, Flex, useMainSidebarState } from '@lifeforge/ui'

import WorkspaceSwitcher from '@/core/workspaces/WorkspaceSwitcher'

import CustomPages from './CustomPages'
import SidebarBottomBar from './SidebarBottomBar'
import SidebarEventBanner from './SidebarEventBanner'
import SidebarHeader from './SidebarHeader'
import SidebarItems from './SidebarItems'
import './sidebar.css'

function Sidebar() {
  const { t } = useTranslation('common.appBar')
  const { sidebarExpanded, toggleSidebar } = useMainSidebarState()
  const location = useLocation()

  const route = `${location.pathname}${location.search}`

  const previousRoute = useRef(route)
  const [searchQuery, setSearchQuery] = useState('')
  const sidebarRef = useRef<HTMLElement>(null)
  const previouslyExpanded = useRef(sidebarExpanded)

  useEffect(() => {
    const opened = sidebarExpanded && !previouslyExpanded.current
    previouslyExpanded.current = sidebarExpanded
    const sidebar = sidebarRef.current

    if (!opened || !sidebar || window.innerWidth > 1000) return

    const previousFocus = document.activeElement
    sidebar
      .querySelector<HTMLInputElement>('input')
      ?.focus({ preventScroll: true })

    return () => {
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
        aria-label={t('closeSidebar')}
        as="button"
        className="monolith-sidebar-backdrop"
        data-expanded={sidebarExpanded}
        aria-hidden={!sidebarExpanded}
        inert={!sidebarExpanded}
        tabIndex={-1}
        type="button"
        onClick={toggleSidebar}
      />
      <Flex
        ref={sidebarRef}
        as="aside"
        bg={{ base: 'bg-50', dark: 'bg-900' }}
        className="zillion-main-sidebar"
        data-expanded={sidebarExpanded}
        aria-hidden={!sidebarExpanded}
        inert={!sidebarExpanded}
        direction="column"
        flexShrink="0"
        height="100%"
        id="workspace-navigation"
        left="0"
        minWidth="0"
        overflow="hidden"
        position="relative"
        r="none"
        top="0"
        width="min(100%, 250px)"
        zIndex="99"
        onKeyDown={event => {
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
            event.key === 'Escape' &&
            !event.defaultPrevented &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            toggleSidebar()
          }
        }}
      >
        <SidebarEventBanner />
        <SidebarHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <WorkspaceSwitcher />
        <Box
          className="monolith-sidebar-scroll"
          flex="1"
          minHeight="0"
          overflowX="hidden"
          overflowY="auto"
          pb="md"
        >
          <CustomPages />
          <SidebarItems query={searchQuery} />
        </Box>
        <SidebarBottomBar />
      </Flex>
    </>
  )
}

export default Sidebar
