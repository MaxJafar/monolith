import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Stack, TextAreaInput, TextInput } from '@lifeforge/ui'

import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

export function LibraryCollectionForm({
  initial,
  busy,
  readOnly = false,
  onSave,
  onSaved,
  onCancel
}: {
  initial?: { name: string; description: string }
  busy: boolean
  readOnly?: boolean
  onSave: (values: {
    name: string
    description: string
  }) => Promise<string | null>
  onSaved: (id: string) => void
  onCancel: () => void
}) {
  const { t } = useModuleTranslation()

  const [name, setName] = useState(initial?.name ?? ''),
    [description, setDescription] = useState(initial?.description ?? '')
  const { blocker, allowNavigation } = useDraftGuard(
    busy ||
      name !== (initial?.name ?? '') ||
      description !== (initial?.description ?? '')
  )

  return (
    <Stack
      aria-label={t(
        initial ? 'library.editCollection' : 'library.newCollection'
      )}
      as="form"
      gap="md"
      onSubmit={async event => {
        event.preventDefault()
        if (
          busy ||
          readOnly ||
          !name.trim() ||
          name.trim().length > 160 ||
          description.length > 2000
        )
          return

        const saved = await onSave({
          name: name.trim(),
          description: description.trim()
        })

        if (saved) {
          allowNavigation()
          onSaved(saved)
        }
      }}
    >
      <DraftNotice blocker={blocker} />
      <TextInput
        autoFocus
        required
        disabled={busy || readOnly}
        label={t('library.collectionName')}
        namespace={false}
        placeholder={t('library.collectionName')}
        value={name}
        onChange={setName}
      />
      <TextAreaInput
        disabled={busy || readOnly}
        label={t('inputs.description')}
        namespace={false}
        placeholder={t('library.descriptionPlaceholder')}
        value={description}
        onChange={setDescription}
      />
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={
            readOnly ||
            !name.trim() ||
            name.trim().length > 160 ||
            description.length > 2000
          }
          loading={busy}
          namespace={false}
          type="submit"
        >
          {t('buttons.save')}
        </Button>
        <Button
          disabled={busy}
          namespace={false}
          type="button"
          variant="secondary"
          onClick={() => {
            allowNavigation()
            onCancel()
          }}
        >
          {t('buttons.cancel')}
        </Button>
      </Flex>
    </Stack>
  )
}
