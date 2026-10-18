import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  FloatingPopover,
  Stack,
  Text
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { DraftConfirmation, DraftNotice, useDraftGuard } from '@/useDraftGuard'

import type { RecordPage } from '../../../../shared'

export function WorkCreatePopover({
  anchor,
  kind,
  projectId = '',
  onClose,
  onCreated
}: {
  anchor: HTMLElement
  kind: 'project' | 'action'
  projectId?: string
  onClose: () => void
  onCreated?: (record: RecordPage) => void
}) {
  const { t } = useTranslation('common.workHub')
  const { data, api, run, busy, readOnly } = useDatabases()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [project, setProject] = useState(projectId)
  const [date, setDate] = useState('')

  const [priority, setPriority] = useState<
    'low' | 'normal' | 'high' | 'urgent'
  >('normal')
  const [base, setBase] = useState(
    data.bases.find(row => row.table_type === kind)?.id ?? ''
  )

  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [discard, setDiscard] = useState(false)

  const dirty =
    !!title ||
    !!description ||
    !!date ||
    project !== projectId ||
    priority !== 'normal'

  const { blocker, allowNavigation } = useDraftGuard(dirty || pending)

  const disabled = busy || pending || readOnly
  const projects = data.records.filter(row => row.item_type === 'project')

  function close() {
    if (pending) return
    if (dirty) setDiscard(true)
    else onClose()
  }

  async function save() {
    if (disabled || !title.trim()) return
    setPending(true)
    setFailed(false)
    const result = await run(async () => {
      const target = base
        ? { id: base }
        : await api.createBase.mutate({
            name: t(kind === 'project' ? 'projects' : 'actions'),
            description: '',
            table_type: kind
          })
      setBase(target.id)

      return api.createRecord.mutate({
        base_id: target.id,
        title: title.trim(),
        description,
        content: '',
        values: {},
        item_type: kind === 'action' ? 'task' : 'project',
        project_id: kind === 'action' ? project || null : null,
        priority,
        ...(date ? { date: new Date(`${date}T12:00:00`).toISOString() } : {})
      })
    })
    setPending(false)

    if (!result) {
      setFailed(true)

      return
    }
    allowNavigation()
    onCreated?.(result)
    onClose()
  }

  return (
    <FloatingPopover
      align="end"
      anchor={anchor}
      className="work-composer"
      label={t(kind === 'project' ? 'newProject' : 'newAction')}
      width={400}
      onClose={close}
    >
      <Stack
        as="form"
        gap="md"
        p="sm"
        onSubmit={event => {
          event.preventDefault()
          void save()
        }}
      >
        <Flex align="center" justify="between">
          <Text weight="semibold">
            {t(kind === 'project' ? 'newProject' : 'newAction')}
          </Text>
          <Button
            aria-label={t('close')}
            icon="lucide:x"
            namespace={false}
            variant="plain"
            onClick={close}
          />
        </Flex>
        <Box
          autoFocus
          required
          aria-label={t('title')}
          as="input"
          className="work-title-input"
          disabled={disabled}
          maxLength={255}
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
        <Box
          aria-label={t('description')}
          as="textarea"
          className="work-description"
          disabled={disabled}
          maxLength={10000}
          placeholder={t('descriptionPlaceholder')}
          rows={2}
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
        {kind === 'action' && (
          <Stack gap="xs">
            <Text color="muted" size="xs">
              {t('project')}
            </Text>
            <ChoiceSelect
              disabled={disabled}
              label={t('project')}
              options={[
                { value: '', label: t('noProject') },
                ...projects.map(row => ({ value: row.id, label: row.title }))
              ]}
              value={project}
              onChange={setProject}
            />
          </Stack>
        )}
        <Flex align="end" gap="md">
          <Stack flex="1" gap="xs">
            <Text as="label" color="muted" htmlFor="work-due-date" size="xs">
              {t('dueDate')}
            </Text>
            <Box
              as="input"
              className="work-date"
              disabled={disabled}
              id="work-due-date"
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
            />
          </Stack>
          <Stack flex="1" gap="xs">
            <Text color="muted" size="xs">
              {t('priority')}
            </Text>
            <ChoiceSelect
              disabled={disabled}
              label={t('priority')}
              options={['low', 'normal', 'high', 'urgent'].map(value => ({
                value,
                label: t(`priorities.${value}`)
              }))}
              value={priority}
              onChange={value => setPriority(value as typeof priority)}
            />
          </Stack>
        </Flex>
        <Box as="details" className="work-storage">
          <Box as="summary">{t('storage')}</Box>
          <ChoiceSelect
            disabled={disabled}
            label={t('table')}
            options={[
              { value: '', label: t('newTable') },
              ...data.bases
                .filter(
                  row =>
                    row.table_type === kind ||
                    row.table_type === 'general' ||
                    !row.table_type
                )
                .map(row => ({ value: row.id, label: row.name }))
            ]}
            value={base}
            onChange={setBase}
          />
        </Box>
        {failed && (
          <Text color="muted" role="alert">
            {t('saveFailed')}
          </Text>
        )}
        <Flex justify="end">
          <Button
            disabled={disabled || !title.trim()}
            icon="lucide:plus"
            loading={pending}
            namespace={false}
            type="submit"
          >
            {t('create')}
          </Button>
        </Flex>
        {discard && (
          <DraftConfirmation
            onDiscard={() => {
              allowNavigation()
              onClose()
            }}
            onKeepEditing={() => setDiscard(false)}
          />
        )}
        <DraftNotice blocker={blocker} />
      </Stack>
    </FloatingPopover>
  )
}
