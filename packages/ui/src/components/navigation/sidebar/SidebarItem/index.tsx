// SPDX-License-Identifier: 0BSD
import { type ReactElement, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { ContextMenu } from '@/components/overlays'
import { useModuleSidebarState } from '@/providers'

import { ExpandButton, NavigationRow, useSidebarLabel } from '../shared'

interface SidebarItemProps {
  label: string | ReactElement
  icon?: string | ReactElement
  active?: boolean
  onClick?: (() => void) | 'expand'
  onCancelButtonClick?: () => void
  sideStripColor?: string
  number?: number
  actionButtonProps?: { icon: string; onClick: () => void }
  contextMenuItems?: ReactElement
  classNames?: { wrapper?: string; icon?: string }
  namespace?: string | false
  subsection?: {
    label: string
    icon: string | ReactElement
    onClick: () => void
    active: boolean
    namespace?: string | false
    amount?: number
  }[]
}

export function SidebarItem(props: SidebarItemProps) {
  const { label, icon, active = false, onClick, subsection, namespace } = props
  const { setIsSidebarOpen } = useModuleSidebarState()
  const translate = useSidebarLabel(namespace)
  const { t } = useTranslation('common.sidebar')
  const [expanded, setExpanded] = useState(active)
  const section = useId()
  const hasChildren = Boolean(subsection?.length)
  const title = translate(label)
  function choose(callback: () => void) {
    callback()
    setIsSidebarOpen(false)
  }
  function select() {
    if (onClick === 'expand') {
      if (hasChildren) setExpanded(value => !value)
    } else if (onClick) choose(onClick)
  }
  return (
    <>
      <NavigationRow
        label={title}
        icon={icon}
        active={active}
        count={props.number}
        className={props.classNames?.wrapper}
        iconClassName={props.classNames?.icon}
        sideStripColor={props.sideStripColor}
        onClick={select}
        expanded={onClick === 'expand' && hasChildren ? expanded : undefined}
        controls={onClick === 'expand' && hasChildren ? section : undefined}
        tools={
          <>
            {props.actionButtonProps && (
              <Button
                variant="plain"
                p="xs"
                icon={props.actionButtonProps.icon}
                aria-label={t('itemAction', {
                  name: typeof title === 'string' ? title : ''
                })}
                onClick={() => choose(props.actionButtonProps!.onClick)}
              />
            )}
            {props.contextMenuItems && (
              <ContextMenu>{props.contextMenuItems}</ContextMenu>
            )}
            {active && props.onCancelButtonClick && (
              <Button
                variant="plain"
                p="xs"
                icon="tabler:x"
                aria-label={t('clearSelection')}
                onClick={() => choose(props.onCancelButtonClick!)}
              />
            )}
            {hasChildren && onClick !== 'expand' && (
              <ExpandButton
                expanded={expanded}
                controls={section}
                label={t('toggleSection')}
                onClick={() => setExpanded(value => !value)}
              />
            )}
          </>
        }
      />
      {hasChildren && (
        <li hidden={!expanded}>
          <ul id={section} className="monolith-sidebar-children">
            {subsection!.map((item, index) => (
              <SidebarItem
                key={item.label + ':' + index}
                {...item}
                number={item.amount}
                namespace={item.namespace ?? namespace}
              />
            ))}
          </ul>
        </li>
      )}
    </>
  )
}
