import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Stack, Text } from '@monolith/ui'
import { useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'

import type { Base } from '../../../shared'
import { BaseCreateMenu } from './BaseCreateMenu'

export function BaseEditor({
  base,
  onDone
}: {
  base?: Base
  onDone: () => void
}) {
  const { t } = useModuleTranslation()
  const { api: workspaceAPI, run, busy, readOnly } = useDatabases()
  const [name, setName] = useState(base?.name ?? t('newDatabaseName'))
  const [description, setDescription] = useState(base?.description ?? '')

  async function save() {
    if (!base || busy || readOnly) return
    const result = await run(() =>
      workspaceAPI.updateBase
        .input({ id: base.id })
        .mutate({ name: name.trim(), description })
    )

    if (result) {
      onDone()
    }
  }

  if (!base) return <BaseCreateMenu onDone={onDone} />

  return (
    <Stack
      as="form"
      gap="sm"
      className="database-create-form"
      onSubmit={event => {
        event.preventDefault()
        if (name.trim() && !busy && !readOnly) void save()
      }}
    >
      <Text as="label" size="sm" color="muted">
        {t('inputs.name')}
        <Box
          as="input"
          autoFocus
          data-autofocus
          disabled={busy || readOnly}
          required
          maxLength={255}
          aria-label={t('inputs.name')}
          className="database-name-input"
          value={name}
          onFocus={event => event.currentTarget.select()}
          onChange={event => setName(event.target.value)}
        />
      </Text>
      <Text as="label" size="sm" color="muted">
        {t('inputs.description')}
        <Box
          as="textarea"
          className="database-description-input"
          rows={3}
          maxLength={10000}
          disabled={busy || readOnly}
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
      </Text>
      <Flex gap="sm" wrap="wrap">
        <Button
          type="submit"
          disabled={!name.trim() || busy || readOnly}
          icon="tabler:check"
          loading={busy}
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
          type="button"
          icon="tabler:trash"
          variant="plain"
          justify="start"
          width="100%"
          disabled={busy || readOnly}
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
