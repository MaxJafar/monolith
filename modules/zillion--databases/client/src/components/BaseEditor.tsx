import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Stack, TextAreaInput, TextInput } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import type { Base } from '../../../shared'

export function BaseEditor({
  base,
  onDone
}: {
  base?: Base
  onDone: () => void
}) {
  const { t } = useModuleTranslation()
  const { api: forgeAPI, run, busy, selectBase } = useDatabases()
  const [name, setName] = useState(base?.name ?? '')
  const [description, setDescription] = useState(base?.description ?? '')

  async function save() {
    const result = await run(() =>
      base
        ? forgeAPI.updateBase
            .input({ id: base.id })
            .mutate({ name, description })
        : forgeAPI.createBase.mutate({ name, description })
    )

    if (result) {
      selectBase(result.id)
      onDone()
    }
  }

  return (
    <Stack bg={{ base: 'bg-100', dark: 'bg-900' }} gap="md" p="md" r="lg">
      <TextInput
        required
        icon="tabler:database"
        label="inputs.name"
        placeholder=""
        value={name}
        onChange={setName}
      />
      <TextAreaInput
        icon="tabler:align-left"
        label="inputs.description"
        placeholder=""
        value={description}
        onChange={setDescription}
      />
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!name.trim()}
          icon="tabler:check"
          loading={busy}
          onClick={() => {
            void save()
          }}
        >
          save
        </Button>
        <Button variant="secondary" onClick={onDone}>
          cancel
        </Button>
        {base && (
          <Button
            dangerous
            icon="tabler:trash"
            variant="secondary"
            onClick={() => {
              if (window.confirm(t('confirmDeleteBase')))
                void run(async () => {
                  await forgeAPI.removeBase
                    .input({ id: base.id })
                    .mutate(undefined)
                  onDone()
                })
            }}
          >
            delete
          </Button>
        )}
      </Flex>
    </Stack>
  )
}
