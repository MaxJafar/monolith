import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useAuth } from '@lifeforge/api'
import type { CanvasBlock, PageTarget } from '@lifeforge/blocks'

import { BlockEditor } from '@/components/display/BlockEditor'
import { Box, Stack, Text } from '@/components/primitives'
import { forgeAPI } from '@/utils/forgeAPI'

import { useCanvasWidgets } from './CanvasWidgets'

export function CanvasDocumentBlock({
  block,
  editing,
  onChange,
  onValidity
}: {
  block: CanvasBlock
  editing: boolean
  onChange: (block: CanvasBlock) => void
  onValidity: (valid: boolean) => void
}) {
  const { t } = useTranslation('common.canvas')
  const { userData } = useAuth()
  const navigate = useNavigate()
  const { pages: workspacePages, openPage } = useCanvasWidgets()

  const options = forgeAPI.user.pages.list.queryOptions()

  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!userData?.id && !workspacePages
  })

  const pages: PageTarget[] =
    workspacePages ??
    (query.data ?? [])
      .filter(page =>
        /^\/page\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          page.key
        )
      )
      .map(page => ({
        id: page.key.slice('/page/'.length),
        kind: 'document',
        title: page.title
      }))

  return (
    <Stack gap="sm">
      {block.title &&
        (editing ? (
          <Box
            aria-label={t('blockTitle')}
            as="input"
            className="canvas-inline-block-title"
            value={block.title}
            onChange={event =>
              onChange({ ...block, title: event.target.value })
            }
          />
        ) : (
          <Text as="h2">{block.title}</Text>
        ))}
      <BlockEditor
        label={t('document')}
        pages={pages}
        readOnly={!editing}
        value={block.content}
        onChange={content => onChange({ ...block, content })}
        onOpenPage={target => {
          if (
            pages.some(
              page => page.id === target.id && page.kind === target.kind
            )
          )
            if (openPage) openPage(target)
            else navigate(`/page/${target.id}`)
        }}
        onValidityChange={onValidity}
      />
    </Stack>
  )
}
