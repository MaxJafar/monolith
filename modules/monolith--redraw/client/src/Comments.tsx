import { useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Stack, Text, TextAreaInput, surface } from '@monolith/ui'
import { useState } from 'react'

import { workspaceAPI } from '../manifest'
import { useEditor } from './EditorProvider'

export function CommentPins() {
  const e = useEditor(),
    { t } = useModuleTranslation()

  return (
    <g>
      {e.comments
        .filter(c => !c.parent_id && !c.resolved && c.page_id === e.pageId)
        .map((c, i) => {
          const target = e.renderedPage.elements.find(
            el => el.id === c.element_id
          )
          const x = target ? target.x + c.x : c.x,
            y = target ? target.y + c.y : c.y

          return (
            <g
              key={c.id}
              aria-label={t('comments.openThread', { name: c.name })}
              data-comment-pin={c.id}
              role="button"
              tabIndex={0}
              transform={`translate(${x} ${y}) scale(${1 / e.view.zoom})`}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation()
                  event.preventDefault()
                  e.setCommentsOpen(true)
                  e.setActiveComment(c.id)
                }
              }}
              onPointerDown={event => {
                event.stopPropagation()
                e.setCommentsOpen(true)
                e.setActiveComment(c.id)
              }}
            >
              <circle
                fill={e.activeComment === c.id ? '#6d28d9' : '#7c3aed'}
                r="13"
                stroke="white"
                strokeWidth="2"
              />
              <text
                fill="white"
                fontSize="12"
                pointerEvents="none"
                textAnchor="middle"
                y="4"
              >
                {i + 1}
              </text>
            </g>
          )
        })}
    </g>
  )
}

export function CommentsPanel() {
  const e = useEditor(),
    { t } = useModuleTranslation(),
    { userData } = useAuth()
  const [body, setBody] = useState(''),
    [showResolved, setShowResolved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const scope = { workspace_id: e.workspaceId, project_id: e.projectId }
  const active = e.comments.find(c => c.id === e.activeComment && !c.parent_id)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')

    try {
      await action()
      await e.refreshComments()

      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))

      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack
      aria-label={t('comments.title')}
      as="aside"
      bg={surface.default}
      gap="md"
      height="100%"
      overflowY="auto"
      p="md"
    >
      <Flex align="center" justify="between">
        <Text weight="semibold">{t('comments.title')}</Text>
        <Button variant="plain" onClick={() => e.setCommentsOpen(false)}>
          closePanel
        </Button>
      </Flex>
      {(error || e.commentsError) && (
        <Text color="dangerous" role="alert">
          {error || t('comments.loadFailed')}
        </Text>
      )}
      <Button
        disabled={e.readOnly}
        variant={e.tool === 'comment' ? 'secondary' : 'plain'}
        onClick={() => {
          e.setTool('comment')
          e.setActiveComment(null)
          e.setCommentPin(null)
          e.setCommentsOpen(false)
        }}
      >
        pinComment
      </Button>
      <Button variant="plain" onClick={() => setShowResolved(!showResolved)}>
        {showResolved ? 'hideResolved' : 'showResolved'}
      </Button>
      {e.comments
        .filter(c => !c.parent_id && (showResolved || !c.resolved))
        .map(c => (
          <Button
            key={c.id}
            justify="start"
            namespace={false}
            variant={active?.id === c.id ? 'secondary' : 'plain'}
            onClick={() => {
              e.choosePage(c.page_id)
              e.setActiveComment(c.id)
              e.setCommentPin(null)
              setBody('')
            }}
          >
            {`${c.resolved ? '✓ ' : ''}${c.name}: ${c.body.slice(0, 100)}`}
          </Button>
        ))}
      {!e.comments.length && (
        <Text color="muted" size="sm">
          {t('comments.empty')}
        </Text>
      )}
      {active && (
        <Stack gap="sm">
          {[active, ...e.comments.filter(c => c.parent_id === active.id)].map(
            c => (
              <Stack key={c.id} bg={surface.light} gap="xs" p="sm" r="md">
                <Flex justify="between">
                  <Text size="sm" weight="semibold">
                    {c.name}
                  </Text>
                  <Text color="muted" size="xs">
                    {new Date(c.created).toLocaleString()}
                  </Text>
                </Flex>
                <Text
                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {c.body}
                </Text>
                {!e.readOnly && c.actor_id === userData?.id && (
                  <Button
                    dangerous
                    disabled={busy}
                    variant="plain"
                    onClick={() => {
                      void run(() =>
                        workspaceAPI.comments.remove
                          .input(scope)
                          .mutate({ id: c.id })
                      )
                    }}
                  >
                    deleteComment
                  </Button>
                )}
              </Stack>
            )
          )}
          <Button
            disabled={e.readOnly || busy}
            variant="secondary"
            onClick={() => {
              void run(() =>
                workspaceAPI.comments.resolve
                  .input(scope)
                  .mutate({ id: active.id, resolved: !active.resolved })
              )
            }}
          >
            {active.resolved ? 'reopenThread' : 'resolveThread'}
          </Button>
        </Stack>
      )}
      {!e.readOnly && (active || e.commentPin) && (
        <Stack gap="sm">
          <TextAreaInput
            disabled={busy}
            label="comment"
            placeholder={t('inputs.comment.placeholder')}
            value={body}
            onChange={value => setBody(value.slice(0, 5000))}
          />
          <Button
            disabled={!body.trim() || busy}
            loading={busy}
            onClick={async () => {
              const pin = e.commentPin
              const id = crypto.randomUUID()

              if (
                await run(async () => {
                  if (!(await e.flush())) throw Error(t('save.error'))

                  return workspaceAPI.comments.create.input(scope).mutate({
                    id,
                    page_id: active?.page_id ?? e.pageId,
                    element_id: active?.element_id ?? pin?.element ?? null,
                    parent_id: active?.id ?? null,
                    x: active?.x ?? pin?.x ?? 0,
                    y: active?.y ?? pin?.y ?? 0,
                    body: body.trim()
                  })
                })
              ) {
                setBody('')
                e.setCommentPin(null)
                e.setActiveComment(active?.id ?? id)
                e.setTool('select')
              }
            }}
          >
            {active ? 'replyComment' : 'postComment'}
          </Button>
        </Stack>
      )}
      {e.tool === 'comment' && !e.commentPin && (
        <Text color="muted" size="sm">
          {t('comments.pinHint')}
        </Text>
      )}
    </Stack>
  )
}
