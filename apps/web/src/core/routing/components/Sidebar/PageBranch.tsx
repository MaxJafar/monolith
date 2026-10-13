import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Box, Button, Flex, Stack, Text, colorWithOpacity } from '@lifeforge/ui'

type Page = {
  id: string
  title: string
  icon: string
  parent_id: string | null
}

type PageBranchProps = {
  page: Page
  childrenByParent: Map<string | null, Page[]>
  activePath: string
  activeAncestors: Set<string>
  canEdit: boolean
  createChild: (parent: string) => Promise<void>
  pending: boolean
  depth?: number
}

export default function PageBranch({
  page,
  childrenByParent,
  activePath,
  activeAncestors,
  canEdit,
  createChild,
  pending,
  depth = 0
}: PageBranchProps) {
  const { t } = useTranslation('common.canvas')
  const [expanded, setExpanded] = useState(false)
  const [collapsedRoute, setCollapsedRoute] = useState<string | null>(null)

  const children = childrenByParent.get(page.id) ?? []
  const isOpen =
    expanded || (activeAncestors.has(page.id) && collapsedRoute !== activePath)
  const selected = activePath === `/page/${page.id}`
  const childrenId = `workspace-page-children-${page.id}`

  function toggle() {
    setExpanded(!isOpen)
    setCollapsedRoute(isOpen ? activePath : null)
  }

  return (
    <Box as="li" minWidth="0">
      <Flex
        align="center"
        bg={selected ? colorWithOpacity('primary', '10%') : undefined}
        className="monolith-page-row"
        data-active={selected}
        minWidth="0"
      >
        {children.length > 0 && depth < 20 ? (
          <Button
            aria-controls={childrenId}
            aria-expanded={isOpen}
            aria-label={page.title}
            className="monolith-navigation-action"
            icon={isOpen ? 'lucide:chevron-down' : 'lucide:chevron-right'}
            iconProps={{ size: '1rem' }}
            namespace={false}
            p="xs"
            variant="plain"
            onClick={toggle}
          />
        ) : (
          <Box
            aria-hidden="true"
            className="monolith-page-indent"
            flexShrink="0"
          />
        )}
        <Button
          aria-current={selected ? 'page' : undefined}
          as={Link}
          className="monolith-page-link"
          flex="1"
          gap="sm"
          icon={page.icon || 'lucide:file-text'}
          iconProps={{ size: '1rem' }}
          justify="start"
          minWidth="0"
          namespace={false}
          p="xs"
          title={page.title}
          to={`/page/${page.id}`}
          variant="plain"
        >
          <Text truncate size="sm" weight={selected ? 'semibold' : 'normal'}>
            {page.title || t('untitled')}
          </Text>
        </Button>
        {canEdit && (
          <Button
            aria-label={`${t('newChildPage')}: ${page.title}`}
            className="monolith-navigation-action monolith-page-add"
            disabled={pending}
            icon="lucide:plus"
            iconProps={{ size: '1rem' }}
            namespace={false}
            p="xs"
            title={t('newChildPage')}
            variant="plain"
            onClick={() => void createChild(page.id)}
          />
        )}
      </Flex>
      {children.length > 0 && depth < 20 && (
        <Stack
          as="ul"
          className="monolith-page-list"
          display={isOpen ? 'flex' : 'none'}
          gap="none"
          id={childrenId}
          inert={!isOpen}
          pl="sm"
        >
          {isOpen &&
            children.map(child => (
              <PageBranch
                key={child.id}
                activeAncestors={activeAncestors}
                activePath={activePath}
                canEdit={canEdit}
                childrenByParent={childrenByParent}
                createChild={createChild}
                depth={depth + 1}
                page={child}
                pending={pending}
              />
            ))}
        </Stack>
      )}
    </Box>
  )
}
