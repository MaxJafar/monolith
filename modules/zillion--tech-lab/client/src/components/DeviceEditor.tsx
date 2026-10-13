import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Flex,
  Grid,
  NumberInput,
  Stack,
  TagsInput,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { forgeAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import { type Device, deviceInputSchema } from '../../../shared'

const textFields = [
  'name',
  'kind',
  'host',
  'os',
  'cpu',
  'gpu',
  'storage',
  'location',
  'management_url',
  'glances_url'
] as const

export function DeviceEditor({
  device,
  onDone
}: {
  device?: Device
  onDone: () => void
}) {
  const { t } = useModuleTranslation()
  const { pending, run, devicesById } = useTechLab()
  const [source] = useState(device)

  const [initial] = useState(() => ({
    ...deviceInputSchema.strip().parse(source ?? { name: '_' }),
    name: source?.name ?? ''
  }))

  const [draft, setDraft] = useState(initial)

  const dirty = JSON.stringify(initial) !== JSON.stringify(draft)

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  const newer = source && devicesById.get(source.id)?.updated !== source.updated

  async function save() {
    const result = await run(() =>
      forgeAPI.devices.save.mutate({
        ...draft,
        ...(source ? { id: source.id, expected_updated: source.updated } : {})
      })
    )

    if (result.ok) {
      allowNavigation()
      onDone()
    }
  }

  return (
    <Card gap="md">
      <DraftNotice blocker={blocker} />
      <Text as="h2" size="xl" weight="semibold">
        {t(source ? 'editDevice' : 'addDevice')}
      </Text>
      {newer && (
        <Text color="dangerous" role="alert">
          {t('messages.newerVersion')}
        </Text>
      )}
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        {textFields.map(field => (
          <TextInput
            key={field}
            icon={field.includes('url') ? 'lucide:link' : 'lucide:server'}
            label={`inputs.${field}`}
            placeholder=""
            required={field === 'name'}
            value={draft[field]}
            onChange={value => setDraft({ ...draft, [field]: value })}
          />
        ))}
        <Stack gap="sm">
          <NumberInput
            icon="lucide:monitor"
            label="inputs.ram_gb"
            min={0}
            value={draft.ram_gb ?? 0}
            onChange={ram_gb => setDraft({ ...draft, ram_gb })}
          />
          <Flex align="center" gap="sm">
            <Text color="muted">
              {draft.ram_gb === null
                ? t('status.unknown')
                : `${draft.ram_gb} GB`}
            </Text>
            <Button
              variant="plain"
              onClick={() => setDraft({ ...draft, ram_gb: null })}
            >
              clear
            </Button>
          </Flex>
        </Stack>
      </Grid>
      <Text color="muted" size="sm">
        {t('devices.glancesHelp')}
      </Text>
      <TagsInput
        icon="tabler:tags"
        label="inputs.tags"
        placeholder=""
        value={draft.tags}
        onChange={tags => setDraft({ ...draft, tags })}
      />
      <TextAreaInput
        icon="tabler:notes"
        label="inputs.notes"
        placeholder=""
        value={draft.notes}
        onChange={notes => setDraft({ ...draft, notes })}
      />
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!deviceInputSchema.safeParse(draft).success}
          loading={pending}
          onClick={() => void save()}
        >
          save
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!dirty || window.confirm(t('messages.discardChanges'))) {
              allowNavigation()
              onDone()
            }
          }}
        >
          cancel
        </Button>
      </Flex>
    </Card>
  )
}
