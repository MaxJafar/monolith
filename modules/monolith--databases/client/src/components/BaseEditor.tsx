import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, ChoiceSelect, Flex, Stack, Text } from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import { type Base, tableType } from '../../../shared'
import { BaseCreateMenu } from './BaseCreateMenu'

export function BaseEditor({
  base,
  onDone
}: {
  base?: Base
  onDone: () => void
}) {
  const { t } = useModuleTranslation()
  const { t: work } = useTranslation('common.workHub')
  const { api: workspaceAPI, run, busy, readOnly } = useDatabases()
  const [name, setName] = useState(base?.name ?? t('newDatabaseName'))
  const [description, setDescription] = useState(base?.description ?? '')
  const [type, setType] = useState(base?.table_type ?? 'general')

  async function save() {
    if (!base || busy || readOnly) return

    const result = await run(() =>
      workspaceAPI.updateBase
        .input({ id: base.id })
        .mutate({ name: name.trim(), description, table_type: type })
    )

    if (result) {
      onDone()
    }
  }

  if (!base) return <BaseCreateMenu onDone={onDone} />

  return (
    <Stack
      as="form"
      className="database-create-form"
      gap="sm"
      onSubmit={event => {
        event.preventDefault()
        if (name.trim() && !busy && !readOnly) void save()
      }}
    >
      <Text as="label" color="muted" size="sm">
        {t('inputs.name')}
        <Box
          autoFocus
          data-autofocus
          required
          aria-label={t('inputs.name')}
          as="input"
          className="database-name-input"
          disabled={busy || readOnly}
          maxLength={255}
          value={name}
          onChange={event => setName(event.target.value)}
          onFocus={event => event.currentTarget.select()}
        />
      </Text>
      <Text as="label" color="muted" size="sm">
        {t('inputs.description')}
        <Box
          as="textarea"
          className="database-description-input"
          disabled={busy || readOnly}
          maxLength={10000}
          rows={3}
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
      </Text>
      <Stack gap="xs">
        <Text color="muted" size="sm">
          {work('tableType')}
        </Text>
        <ChoiceSelect
          disabled={busy || readOnly}
          label={work('tableType')}
          options={tableType.options.map(value => ({
            value,
            label: work(`tableTypes.${value}`)
          }))}
          value={type}
          onChange={value => setType(tableType.parse(value))}
        />
        <Text color="muted" size="xs">
          {work('tableTypeHelp')}
        </Text>
      </Stack>
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!name.trim() || busy || readOnly}
          icon="tabler:check"
          loading={busy}
          type="submit"
        >
          save
        </Button>
        <Button type="button" variant="plain" onClick={onDone}>
          cancel
        </Button>
      </Flex>
      <Box className="database-settings-divider">
        <Button
          dangerous
          disabled={busy || readOnly}
          icon="tabler:trash"
          justify="start"
          type="button"
          variant="plain"
          width="100%"
          onClick={() => {
            if (window.confirm(t('confirmDeleteBase')))
              void run(async () => {
                await workspaceAPI.removeBase
                  .input({ id: base.id })
                  .mutate(undefined)
                onDone()
              })
          }}
        >
          delete
        </Button>
      </Box>
    </Stack>
  )
}
