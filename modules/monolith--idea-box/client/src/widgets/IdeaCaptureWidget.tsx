import { Box, Button, Stack, Text, useModalStore } from '@monolith/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { workspaceAPI } from '@/manifest'
import ModifyContainerModal from '@/pages/Containers/components/ModifyContainerModal'

export const config = {
  id: 'ideaCapture',
  icon: 'lucide:lightbulb',
  minW: 1,
  minH: 2
}

export default function IdeaCaptureWidget({
  readOnly = false,
  filter = '',
  onConfigChange
}: {
  readOnly?: boolean
  filter?: string
  onConfigChange?: (value: string) => void
}) {
  const { t } = useTranslation('common.workspaceUI')

  const [selected, setSelected] = useState(filter),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const cache = useQueryClient(),
    { open } = useModalStore()

  const containers = useQuery(workspaceAPI.containers.list.input({}).queryOptions())

  const container =
    containers.data?.find(item => item.id === selected)?.id ??
    containers.data?.[0]?.id ??
    ''
  const ideas = useQuery({
    ...workspaceAPI.ideas.list.input({ container, path: '' }).queryOptions(),
    enabled: !!container
  })

  async function capture() {
    if (!container || !text.trim() || busy || readOnly) return
    setBusy(true)
    setError('')

    try {
      await workspaceAPI.ideas.create.mutate({
        type: 'text',
        container,
        folder: '',
        tags: [],
        content: text.trim(),
        image: undefined
      })
      setText('')
      await cache.invalidateQueries({ queryKey: workspaceAPI.ideas.list.key })
      await cache.invalidateQueries({ queryKey: workspaceAPI.containers.list.key })
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="sm">
      {container ? (
        <>
          <Box
            aria-label={t('ideas')}
            as="select"
            className="workspace-input"
            value={container}
            onChange={event => {
              setSelected(event.target.value)
              onConfigChange?.(event.target.value)
            }}
          >
            {containers.data?.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Box>
          <Box
            aria-label={t('captureIdea')}
            as="textarea"
            className="workspace-input"
            disabled={readOnly || busy}
            placeholder={t('emptyIdeas')}
            rows={3}
            value={text}
            onChange={event => setText(event.target.value.slice(0, 10000))}
          />
          <Button
            disabled={!text.trim() || readOnly || busy}
            icon="lucide:plus"
            namespace={false}
            variant="secondary"
            onClick={() => void capture()}
          >
            {t('captureIdea')}
          </Button>
          {ideas.data?.slice(0, 3).map(idea => (
            <Text key={idea.id} color="muted" lineClamp={2} size="sm">
              {idea.type === 'text'
                ? idea.content
                : idea.type === 'link'
                  ? idea.link
                  : '▧'}
            </Text>
          ))}
        </>
      ) : (
        <Button
          disabled={readOnly || containers.isPending}
          icon="lucide:plus"
          namespace={false}
          variant="secondary"
          onClick={() => open(ModifyContainerModal, { type: 'create' })}
        >
          {t('captureIdea')}
        </Button>
      )}
      {(error || containers.error || ideas.error) && (
        <Text color="dangerous" role="alert" size="sm">
          {error || containers.error?.message || ideas.error?.message}
        </Text>
      )}
    </Stack>
  )
}
