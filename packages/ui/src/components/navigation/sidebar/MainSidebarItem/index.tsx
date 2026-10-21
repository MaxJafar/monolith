// SPDX-License-Identifier: 0BSD
import { type ReactElement, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { ExpandButton, NavigationRow, useSidebarLabel } from '../shared'

type Props = {
  label: string | ReactElement
  icon?: string | ReactElement
  link: string
  subsection?: { label: string; icon: string | ReactElement; path: string }[]
  sidebarExpanded: boolean
  toggleSidebar: () => void
} & (
  | { autoActive: true; active?: never }
  | { autoActive?: false; active?: boolean }
)

function pathMatches(path: string, link: string) {
  const target = link.split(/[?#]/)[0].replace(/\/$/, '') || '/'
  return path === target || (target !== '/' && path.startsWith(target + '/'))
}
export function MainSidebarItem({
  label,
  icon,
  link,
  subsection,
  sidebarExpanded,
  active,
  autoActive
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useSidebarLabel()
  const { t } = useTranslation('common.sidebar')
  const selected = autoActive
    ? pathMatches(location.pathname, link)
    : Boolean(active)
  const [expanded, setExpanded] = useState(selected)
  const id = useId()
  const title = translate(label, 'app')
  const hasChildren = Boolean(subsection?.length)
  // The host owns drawer dismissal after its unsaved-change guard accepts navigation.
  return (
    <>
      <NavigationRow
        label={title}
        accessibleLabel={typeof title === 'string' ? title : undefined}
        icon={icon}
        active={selected}
        collapsed={!sidebarExpanded}
        onClick={() =>
          hasChildren ? setExpanded(value => !value) : navigate(link)
        }
        expanded={hasChildren ? expanded : undefined}
        controls={hasChildren ? id : undefined}
        tools={
          hasChildren && sidebarExpanded ? (
            <ExpandButton
              expanded={expanded}
              controls={id}
              label={t('toggleSection')}
              onClick={() => setExpanded(value => !value)}
            />
          ) : undefined
        }
      />
      {hasChildren && (
        <li hidden={!expanded}>
          <ul id={id} className="monolith-sidebar-children">
            {subsection!.map(item => {
              const destination =
                link.replace(/\/$/, '') + '/' + item.path.replace(/^\//, '')
              const text = translate(
                item.label,
                'item',
                typeof label === 'string' ? label : undefined
              )
              return (
                <NavigationRow
                  key={destination}
                  label={text}
                  accessibleLabel={typeof text === 'string' ? text : undefined}
                  icon={item.icon}
                  collapsed={!sidebarExpanded}
                  active={pathMatches(location.pathname, destination)}
                  onClick={() => navigate(destination)}
                />
              )
            })}
          </ul>
        </li>
      )}
    </>
  )
}
