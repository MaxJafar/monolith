import { useRef, useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Checkbox,
  Flex,
  NumberInput,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'
import Select from '@/Select'
import { forgeAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import { type WorkItem } from '../../../shared'

export default function Task({ task }: { task: WorkItem }) {
  const { t } = useModuleTranslation(),
    { data, act, busy, navigate } = useAgents()
  const initial = {
    assignee_id: task.assignee_id,
    priority: task.priority,
    blockers: task.blockers,
    context: task.context,
    auto_dispatch: task.auto_dispatch,
    run_budget_cents: task.run_budget_cents,
    auto_approve: task.auto_approve
  }
  const [draft, setDraft] = useState(initial),
    [baseline, setBaseline] = useState(initial),
    [revision, setRevision] = useState(task.revision),
    [estimate, setEstimate] = useState('0'),
    [pageSearch, setPageSearch] = useState(''),
    [comment, setComment] = useState('')

  const request = useRef<{ key: string; signature: string } | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline),
    guard = useDraftGuard(dirty || Boolean(comment))
  const person = data.principals.find(p => p.id === draft.assignee_id)
  const eligible = data.principals.filter(
    p =>
      p.kind === 'human' ||
      (p.status === 'active' &&
        p.role !== 'observer' &&
        data.members.some(
          m =>
            m.principal_id === p.id &&
            m.project_id === task.project_id &&
            m.role !== 'observer'
        ))
  )
  const active = data.runs.find(
    r =>
      r.task_id === task.task_id &&
      ['queued', 'running', 'review'].includes(r.status)
  )

  async function save() {
    if (
      await act(() =>
        forgeAPI.work.assign
          .input({ id: task.task_id })
          .mutate({ ...draft, expected_revision: revision })
      )
    ) {
      setBaseline(draft)
      setRevision(revision + 1)
    }
  }

  async function dispatch() {
    const amount = person?.adapter === 'planner' ? 0 : Number(estimate),
      signature = `${task.task_id}:${revision}:${amount}`

    if (request.current?.signature !== signature)
      request.current = { key: crypto.randomUUID(), signature }

    if (
      await act(() =>
        forgeAPI.run.queue.input({ id: task.task_id }).mutate({
          request_key: request.current!.key,
          expected_revision: revision,
          estimated_cents: amount
        })
      )
    ) {
      request.current = null
      guard.allowNavigation()
      navigate({ section: 'runs', task: task.task_id })
    }
  }

  function toggle(key: 'context' | 'blockers', id: string, checked: boolean) {
    setDraft({
      ...draft,
      [key]: checked ? [...draft[key], id] : draft[key].filter(v => v !== id)
    })
  }

  return (
    <Stack gap="md">
      <DraftNotice blocker={guard.blocker} />
      <Card gap="md">
        <Flex align="start" gap="sm" justify="between">
          <Stack flex="1">
            <Text as="h3" size="xl" weight="semibold">
              {task.title}
            </Text>
            <Text color="muted" size="sm">
              {t('states.' + task.status)} ·{' '}
              {data.projects.find(p => p.id === task.project_id)?.name}
            </Text>
          </Stack>
          <Button
            icon="tabler:x"
            namespace={false}
            variant="plain"
            onClick={() => navigate({ task: null })}
          >
            {t('close')}
          </Button>
        </Flex>
        <Text as="p" color="muted" whiteSpace="pre-wrap">
          {task.content || t('noBrief')}
        </Text>
        <Select
          disabled={busy || !!active}
          label="inputs.assignee"
          options={[
            { value: '', label: t('unassigned') },
            ...eligible.map(p => ({
              value: p.id,
              label: p.kind === 'human' ? t('you') : p.name
            }))
          ]}
          value={draft.assignee_id ?? ''}
          onChange={id =>
            setDraft({
              ...draft,
              assignee_id: id || null,
              auto_dispatch: false,
              auto_approve: false
            })
          }
        />
        <Select
          disabled={busy || !!active}
          label="inputs.priority"
          options={['low', 'medium', 'high'].map(value => ({
            value,
            label: t('priorities.' + value)
          }))}
          value={draft.priority}
          onChange={priority =>
            setDraft({ ...draft, priority: priority as WorkItem['priority'] })
          }
        />
        <Text as="h4" weight="semibold">
          {t('dependencies')}
        </Text>
        <Stack gap="sm" maxHeight="12rem" overflowY="auto">
          {data.tasks
            .filter(
              p =>
                p.project_id === task.project_id && p.task_id !== task.task_id
            )
            .map(p => (
              <Checkbox
                key={p.task_id}
                checked={draft.blockers.includes(p.task_id)}
                disabled={busy || !!active}
                label={`${p.title}${p.completed ? ' ✓' : ''}`}
                onCheckedChange={checked =>
                  toggle('blockers', p.task_id, checked)
                }
              />
            ))}
          {!data.tasks.some(
            p => p.project_id === task.project_id && p.task_id !== task.task_id
          ) && (
            <Text color="muted" size="sm">
              {t('noDependencies')}
            </Text>
          )}
        </Stack>
        <Text as="h4" weight="semibold">
          {t('knowledgeContext')}
        </Text>
        <Text color="muted" size="sm">
          {t('contextHint')}
        </Text>
        <TextInput
          icon="tabler:search"
          label="inputs.pageSearch"
          placeholder={t('inputs.pageSearch')}
          value={pageSearch}
          onChange={setPageSearch}
        />
        <Stack gap="sm" maxHeight="14rem" overflowY="auto">
          {data.pages
            .filter(p =>
              p.title
                .toLocaleLowerCase()
                .includes(pageSearch.toLocaleLowerCase())
            )
            .map(p => (
              <Flex key={p.key} align="center" gap="sm" justify="between">
                <Checkbox
                  checked={draft.context.includes(p.key)}
                  disabled={busy || !!active}
                  label={p.title}
                  onCheckedChange={checked => toggle('context', p.key, checked)}
                />
                <Button
                  aria-label={t('openPage', { name: p.title })}
                  as={Link}
                  icon="tabler:arrow-up-right"
                  namespace={false}
                  to={`/databases?section=graph&focus=${encodeURIComponent(p.key)}`}
                  variant="plain"
                />
              </Flex>
            ))}
          {!data.pages.length && (
            <Text color="muted" size="sm">
              {t('noPages')}
            </Text>
          )}
        </Stack>
        {person?.kind === 'agent' && (
          <Stack gap="md">
            <Text as="h4" weight="semibold">
              {t('automation.title')}
            </Text>
            <Checkbox
              checked={draft.auto_dispatch}
              disabled={busy || !!active || person.adapter === 'planner'}
              label={t('automation.dispatch')}
              onCheckedChange={auto_dispatch =>
                setDraft({ ...draft, auto_dispatch })
              }
            />
            <NumberInput
              disabled={busy || !!active || !draft.auto_dispatch}
              icon="tabler:coin"
              label="inputs.automaticBudget"
              min={0}
              value={draft.run_budget_cents}
              onChange={value =>
                setDraft({ ...draft, run_budget_cents: Number(value) })
              }
            />
            <Checkbox
              checked={draft.auto_approve}
              disabled={busy || !!active}
              label={t('automation.approve')}
              onCheckedChange={auto_approve =>
                setDraft({ ...draft, auto_approve })
              }
            />
            <Text color="muted" size="sm">
              {t('automation.hint')}
            </Text>
          </Stack>
        )}
        {revision !== task.revision && (
          <Text color="dangerous" role="alert">
            {t('assignmentChanged')}
          </Text>
        )}
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={
              busy ||
              !!active ||
              !dirty ||
              !Number.isInteger(draft.run_budget_cents) ||
              draft.run_budget_cents < 0 ||
              draft.run_budget_cents > 10000000
            }
            namespace={false}
            onClick={() => {
              void save()
            }}
          >
            {t('saveAssignment')}
          </Button>
          <Button
            disabled={busy}
            namespace={false}
            variant="plain"
            onClick={() => {
              setDraft(initial)
              setBaseline(initial)
              setRevision(task.revision)
            }}
          >
            {t('reloadLatest')}
          </Button>
        </Flex>
        {active ? (
          <Button
            disabled={busy}
            icon="tabler:activity"
            namespace={false}
            variant="secondary"
            onClick={() => navigate({ section: 'runs', run: active.id })}
          >
            {t('viewRun')}
          </Button>
        ) : (
          !task.completed &&
          person?.kind === 'agent' && (
            <Stack>
              <Text color="muted" size="sm">
                {t(
                  person.adapter === 'planner' ? 'plannerHint' : 'externalHint'
                )}
              </Text>
              {person.adapter !== 'planner' && (
                <NumberInput
                  disabled={busy}
                  icon="tabler:coin"
                  label="inputs.estimate"
                  min={0}
                  placeholder="0"
                  value={Number(estimate)}
                  onChange={value => setEstimate(String(value))}
                />
              )}
              <Button
                disabled={
                  busy ||
                  dirty ||
                  !revision ||
                  !Number.isInteger(Number(estimate)) ||
                  Number(estimate) < 0
                }
                icon="tabler:player-play"
                namespace={false}
                onClick={() => {
                  void dispatch()
                }}
              >
                {t('dispatch')}
              </Button>
            </Stack>
          )
        )}
        <TextAreaInput
          disabled={busy}
          icon="tabler:message"
          label="inputs.comment"
          placeholder={t('commentHint')}
          value={comment}
          onChange={setComment}
        />
        <Button
          disabled={busy || !comment.trim()}
          namespace={false}
          variant="secondary"
          onClick={() => {
            void act(() =>
              forgeAPI.work.comment
                .input({ id: task.task_id })
                .mutate({ message: comment })
            ).then(ok => {
              if (ok) setComment('')
            })
          }}
        >
          {t('addComment')}
        </Button>
      </Card>
    </Stack>
  )
}
