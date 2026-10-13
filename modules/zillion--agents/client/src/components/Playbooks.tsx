import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'
import { forgeAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import type { Playbook } from '../../../shared'

function PlaybookEditor({
  book,
  template
}: {
  book?: Playbook
  template?: 'research' | 'verification'
}) {
  const { t } = useModuleTranslation()
  const { act, busy, navigate } = useAgents()

  const current = {
    name:
      book?.name ?? (template ? t(`playbooks.templates.${template}.name`) : ''),
    description:
      book?.description ??
      (template ? t(`playbooks.templates.${template}.description`) : ''),
    instructions:
      book?.instructions ??
      (template ? t(`playbooks.templates.${template}.instructions`) : ''),
    checks:
      book?.checks.join('\n') ??
      (template ? t(`playbooks.templates.${template}.checks`) : ''),
    require_review: book?.require_review ?? true,
    archived: book?.archived ?? false
  }

  const [draft, setDraft] = useState(current)
  const [baseline, setBaseline] = useState(current)
  const [revision, setRevision] = useState(book?.revision ?? 0)

  const guard = useDraftGuard(
    JSON.stringify(draft) !== JSON.stringify(baseline)
  )
  const checks = draft.checks
    .split('\n')
    .map(check => check.trim())
    .filter(Boolean)
  const valid =
    draft.name.trim().length > 0 &&
    draft.name.trim().length <= 120 &&
    draft.description.length <= 1000 &&
    draft.instructions.trim().length > 0 &&
    draft.instructions.length <= 6000 &&
    checks.length <= 10 &&
    new Set(checks).size === checks.length &&
    checks.every(check => check.length <= 240)

  async function save() {
    const body = { ...draft, checks }

    if (
      await act(() =>
        book
          ? forgeAPI.playbook.update
              .input({ id: book.id })
              .mutate({ ...body, expected_revision: revision })
          : forgeAPI.playbook.create.mutate(body)
      )
    ) {
      guard.allowNavigation()
      navigate({ playbook: null, new: null })
    }
  }

  return (
    <Stack gap="md">
      <DraftNotice blocker={guard.blocker} />
      <Card gap="md">
        <Text as="h3" size="xl" weight="semibold">
          {t(book ? 'playbooks.edit' : 'playbooks.new')}
        </Text>
        <TextInput
          disabled={busy}
          icon="tabler:book"
          label="inputs.playbookName"
          placeholder={t('inputs.playbookName')}
          value={draft.name}
          onChange={name => setDraft({ ...draft, name })}
        />
        <TextInput
          disabled={busy}
          icon="tabler:align-left"
          label="inputs.playbookDescription"
          placeholder={t('inputs.playbookDescription')}
          value={draft.description}
          onChange={description => setDraft({ ...draft, description })}
        />
        <TextAreaInput
          disabled={busy}
          icon="tabler:list-check"
          label="inputs.instructions"
          placeholder={t('instructionsHint')}
          value={draft.instructions}
          onChange={instructions => setDraft({ ...draft, instructions })}
        />
        <TextAreaInput
          disabled={busy}
          icon="tabler:checks"
          label="inputs.qualityChecks"
          placeholder={t('playbooks.checksHint')}
          value={draft.checks}
          onChange={checks => setDraft({ ...draft, checks })}
        />
        <Text color="muted" size="sm">
          {t('playbooks.checksHint')}
        </Text>
        <Checkbox
          checked={draft.require_review}
          disabled={busy}
          label={t('playbooks.requireReview')}
          onCheckedChange={require_review =>
            setDraft({ ...draft, require_review })
          }
        />
        {book && (
          <Checkbox
            checked={draft.archived}
            disabled={busy}
            label={t('playbooks.archive')}
            onCheckedChange={archived => setDraft({ ...draft, archived })}
          />
        )}
        <Text color="muted" size="sm">
          {t('playbooks.snapshotHint')}
        </Text>
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={busy || !valid}
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
            onClick={() => navigate({ playbook: null, new: null })}
          >
            {t('close')}
          </Button>
          {book && (
            <Button
              disabled={busy}
              icon="tabler:refresh"
              namespace={false}
              variant="plain"
              onClick={() => {
                setDraft(current)
                setBaseline(current)
                setRevision(book.revision)
              }}
            >
              {t('reloadLatest')}
            </Button>
          )}
        </Flex>
      </Card>
    </Stack>
  )
}

export default function Playbooks() {
  const { t } = useModuleTranslation()
  const { data, params, navigate } = useAgents()

  const selected = data.playbooks.find(
    book => book.id === params.get('playbook')
  )
  const creating = params.get('new')
  const template =
    creating === 'research' || creating === 'verification'
      ? creating
      : undefined

  return (
    <Stack gap="lg">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack>
          <Text as="h2" size="xl" weight="semibold">
            {t('sections.playbooks')}
          </Text>
          <Text color="muted" size="sm">
            {t('playbooks.intro')}
          </Text>
        </Stack>
        <Button
          icon="tabler:plus"
          namespace={false}
          onClick={() => navigate({ playbook: null, new: 'playbook' })}
        >
          {t('playbooks.new')}
        </Button>
      </Flex>
      <Grid
        gap="lg"
        templateCols={{ base: 1, lg: 'minmax(0, 1fr) minmax(0, 1fr)' }}
      >
        <Stack gap="md">
          {data.playbooks.map(book => (
            <Card key={book.id} gap="sm">
              <Flex align="center" gap="md" justify="between">
                <Text overflowWrap="anywhere" size="lg" weight="semibold">
                  {book.name}
                </Text>
                <Button
                  icon="tabler:edit"
                  namespace={false}
                  variant="plain"
                  onClick={() => navigate({ playbook: book.id, new: null })}
                >
                  {t('edit')}
                </Button>
              </Flex>
              <Text color="muted" overflowWrap="anywhere" size="sm">
                {book.description}
              </Text>
              <Text color="muted" size="sm">
                {t('playbooks.summary', {
                  revision: book.revision,
                  checks: book.checks.length,
                  agents: data.principals.filter(person =>
                    person.playbook_ids?.includes(book.id)
                  ).length
                })}
              </Text>
              <Text size="sm">
                {t(
                  book.archived
                    ? 'playbooks.archived'
                    : book.require_review
                      ? 'playbooks.reviewRequired'
                      : 'playbooks.taskPolicy'
                )}
              </Text>
            </Card>
          ))}
          {!data.playbooks.length && (
            <Card>
              <Text color="muted">{t('playbooks.empty')}</Text>
            </Card>
          )}
          <Card gap="md">
            <Text weight="semibold">{t('playbooks.starters')}</Text>
            <Text color="muted" size="sm">
              {t('playbooks.startersHint')}
            </Text>
            {(['research', 'verification'] as const).map(key => (
              <Button
                key={key}
                namespace={false}
                variant="secondary"
                onClick={() => navigate({ playbook: null, new: key })}
              >
                {t(`playbooks.templates.${key}.name`)}
              </Button>
            ))}
          </Card>
        </Stack>
        {selected || creating ? (
          <PlaybookEditor
            key={selected?.id ?? creating}
            book={selected}
            template={template}
          />
        ) : (
          <Card gap="md">
            <Text weight="semibold">{t('playbooks.assigned')}</Text>
            <Text color="muted">{t('playbooks.assignmentHint')}</Text>
            <Text color="muted">{t('playbooks.evidenceHint')}</Text>
          </Card>
        )}
      </Grid>
    </Stack>
  )
}
