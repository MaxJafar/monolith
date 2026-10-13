import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
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

import { ADAPTERS, type Principal, ROLES } from '../../../shared'

export default function Profile({ person }: { person?: Principal }) {
  const { t } = useModuleTranslation(),
    { data, act, busy, navigate } = useAgents()
  const blank = {
    name: '',
    role: 'contributor' as Principal['role'],
    adapter: 'planner' as Principal['adapter'],
    reports_to: data.principals.find(p => p.kind === 'human')?.id ?? null,
    instructions: '',
    playbook_ids: [] as string[],
    budget_cents: 0,
    status: 'active' as Principal['status']
  }
  const current = person
    ? {
        name: person.name,
        role: person.role,
        adapter: person.adapter,
        reports_to: person.reports_to,
        instructions: person.instructions,
        playbook_ids: person.playbook_ids ?? [],
        budget_cents: person.budget_cents,
        status: person.status
      }
    : blank
  const [draft, setDraft] = useState(current),
    [baseline, setBaseline] = useState(current),
    [revision, setRevision] = useState(person?.revision ?? 0)
  const guard = useDraftGuard(
    JSON.stringify(draft) !== JSON.stringify(baseline)
  )

  function reload() {
    setDraft(current)
    setBaseline(current)
    setRevision(person?.revision ?? 0)
  }

  async function save() {
    const { status, ...body } = draft

    if (
      await act(() =>
        person
          ? forgeAPI.people.update
              .input({ id: person.id })
              .mutate({ ...body, status, expected_revision: revision })
          : forgeAPI.people.create.mutate(body)
      )
    ) {
      guard.allowNavigation()
      navigate({ person: null, new: null })
    }
  }

  return (
    <Stack gap="md">
      <DraftNotice blocker={guard.blocker} />
      <Card gap="md">
        <Text as="h3" size="xl" weight="semibold">
          {t(person ? 'editAgent' : 'newAgent')}
        </Text>
        <TextInput
          disabled={busy}
          icon="tabler:robot"
          label="inputs.name"
          placeholder={t('inputs.name')}
          value={draft.name}
          onChange={name => setDraft({ ...draft, name })}
        />
        <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
          <Select
            disabled={busy}
            label="inputs.role"
            options={ROLES.map(value => ({
              value,
              label: t('roles.' + value)
            }))}
            value={draft.role}
            onChange={role =>
              setDraft({ ...draft, role: role as Principal['role'] })
            }
          />
          <Select
            disabled={busy}
            label="inputs.adapter"
            options={ADAPTERS.map(value => ({
              value,
              label: t('adapters.' + value)
            }))}
            value={draft.adapter}
            onChange={adapter =>
              setDraft({ ...draft, adapter: adapter as Principal['adapter'] })
            }
          />
        </Grid>
        <Select
          disabled={busy}
          label="inputs.manager"
          options={[
            { value: '', label: t('none') },
            ...data.principals
              .filter(p => p.id !== person?.id)
              .map(p => ({
                value: p.id,
                label: p.kind === 'human' ? t('you') : p.name
              }))
          ]}
          value={draft.reports_to ?? ''}
          onChange={reports_to =>
            setDraft({ ...draft, reports_to: reports_to || null })
          }
        />
        <TextAreaInput
          disabled={busy}
          icon="tabler:list-check"
          label="inputs.instructions"
          placeholder={t('instructionsHint')}
          value={draft.instructions}
          onChange={instructions => setDraft({ ...draft, instructions })}
        />
        <Stack gap="sm">
          <Text weight="semibold">{t('playbooks.assigned')}</Text>
          <Text color="muted" size="sm">
            {t('playbooks.assignmentHint')}
          </Text>
          {data.playbooks
            .filter(
              book => !book.archived || draft.playbook_ids.includes(book.id)
            )
            .map(book => (
              <Checkbox
                key={book.id}
                checked={draft.playbook_ids.includes(book.id)}
                disabled={
                  busy ||
                  (!draft.playbook_ids.includes(book.id) &&
                    draft.playbook_ids.length >= 8)
                }
                label={`${book.name}${book.archived ? ` · ${t('playbooks.archived')}` : ''}`}
                onCheckedChange={checked =>
                  setDraft({
                    ...draft,
                    playbook_ids: checked
                      ? [...draft.playbook_ids, book.id]
                      : draft.playbook_ids.filter(id => id !== book.id)
                  })
                }
              />
            ))}
          {!data.playbooks.length && (
            <Text color="muted" size="sm">
              {t('playbooks.emptyAssignment')}
            </Text>
          )}
          {draft.adapter === 'planner' &&
            draft.playbook_ids.some(
              id =>
                data.playbooks.find(book => book.id === id && !book.archived)
                  ?.checks.length
            ) && (
              <Text color="dangerous" size="sm">
                {t('playbooks.plannerHint')}
              </Text>
            )}
        </Stack>
        <NumberInput
          disabled={busy}
          icon="tabler:coin"
          label="inputs.budget"
          min={0}
          placeholder="0"
          value={draft.budget_cents}
          onChange={value =>
            setDraft({ ...draft, budget_cents: Number(value) })
          }
        />
        <Text color="muted" size="sm">
          {t('budgetHint')}
        </Text>
        {person && (
          <Select
            disabled={busy}
            label="inputs.status"
            options={['active', 'paused'].map(value => ({
              value,
              label: t('statuses.' + value)
            }))}
            value={draft.status}
            onChange={status =>
              setDraft({ ...draft, status: status as Principal['status'] })
            }
          />
        )}
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={
              busy ||
              !draft.name.trim() ||
              !Number.isInteger(draft.budget_cents) ||
              draft.budget_cents < 0
            }
            icon="tabler:check"
            namespace={false}
            onClick={() => {
              void save()
            }}
          >
            {t('save')}
          </Button>
          <Button
            disabled={busy}
            namespace={false}
            variant="secondary"
            onClick={() => navigate({ person: null, new: null })}
          >
            {t('close')}
          </Button>
          {person && (
            <Button
              disabled={busy}
              icon="tabler:refresh"
              namespace={false}
              variant="plain"
              onClick={reload}
            >
              {t('reloadLatest')}
            </Button>
          )}
        </Flex>
      </Card>
    </Stack>
  )
}
