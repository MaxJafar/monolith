import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Flex,
  Grid,
  NumberInput,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { workspaceAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import {
  type Service,
  httpUrlSchema,
  monitorKindSchema,
  serviceInputSchema,
  serviceKindSchema
} from '../../../shared'
import { SelectInput } from './SelectInput'

export function ServiceEditor({
  service,
  onDone
}: {
  service?: Service
  onDone: () => void
}) {
  const { t } = useModuleTranslation()
  const { data, pending, run } = useTechLab()
  const [source] = useState(service)

  const [initial] = useState(() => ({
    ...serviceInputSchema.strip().parse(source ?? { name: '_' }),
    name: source?.name ?? ''
  }))

  const [draft, setDraft] = useState(initial)

  const dirty = JSON.stringify(initial) !== JSON.stringify(draft)

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  const newer =
    source &&
    data?.services.find(value => value.id === source.id)?.updated !==
      source.updated
  const validMonitor =
    !draft.monitor_enabled ||
    (draft.monitor_kind !== 'none' &&
      !!draft.monitor_target &&
      (draft.monitor_kind === 'http'
        ? httpUrlSchema.safeParse(draft.monitor_target).success
        : draft.monitor_port !== null))

  async function save() {
    const result = await run(() =>
      workspaceAPI.services.save.mutate({
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
        {t(source ? 'editService' : 'addService')}
      </Text>
      {newer && (
        <Text color="dangerous" role="alert">
          {t('messages.newerVersion')}
        </Text>
      )}
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <TextInput
          required
          icon="lucide:app-window"
          label="inputs.name"
          placeholder=""
          value={draft.name}
          onChange={name => setDraft({ ...draft, name })}
        />
        <SelectInput
          label="inputs.kind"
          options={serviceKindSchema.options.map(value => ({
            value,
            label: t(`kinds.${value}`)
          }))}
          value={draft.kind}
          onChange={kind => setDraft({ ...draft, kind })}
        />
        <TextInput
          icon="tabler:category"
          label="inputs.category"
          placeholder=""
          value={draft.category}
          onChange={category => setDraft({ ...draft, category })}
        />
        <SelectInput
          label="inputs.device"
          options={[
            { value: '', label: t('filters.unassigned') },
            ...(data?.devices.map(device => ({
              value: device.id,
              label: device.name
            })) ?? [])
          ]}
          value={draft.device_id ?? ''}
          onChange={device_id =>
            setDraft({ ...draft, device_id: device_id || null })
          }
        />
        <TextInput
          icon="lucide:link"
          label="inputs.url"
          placeholder=""
          value={draft.url}
          onChange={url => setDraft({ ...draft, url })}
        />
        <TextInput
          icon="tabler:network"
          label="inputs.address"
          placeholder=""
          value={draft.address}
          onChange={address => setDraft({ ...draft, address })}
        />
      </Grid>
      <TextAreaInput
        icon="tabler:text-caption"
        label="inputs.description"
        placeholder=""
        value={draft.description}
        onChange={description => setDraft({ ...draft, description })}
      />
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
      <Stack gap="md">
        <Text as="h3" size="lg" weight="semibold">
          {t('health.configuration')}
        </Text>
        <Text color="muted">{t('health.monitorHelp')}</Text>
        <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
          <SelectInput
            label="inputs.monitor_kind"
            options={monitorKindSchema.options.map(value => ({
              value,
              label: t(`monitors.${value}`)
            }))}
            value={draft.monitor_kind}
            onChange={monitor_kind =>
              setDraft({
                ...draft,
                monitor_kind,
                monitor_port:
                  monitor_kind === 'minecraft'
                    ? (draft.monitor_port ?? 25565)
                    : monitor_kind === 'tcp'
                      ? (draft.monitor_port ?? 1)
                      : null,
                monitor_enabled:
                  monitor_kind === 'none' ? false : draft.monitor_enabled
              })
            }
          />
          <TextInput
            icon="tabler:target"
            label="inputs.monitor_target"
            placeholder=""
            value={draft.monitor_target}
            onChange={monitor_target => setDraft({ ...draft, monitor_target })}
          />
          {['tcp', 'minecraft'].includes(draft.monitor_kind) && (
            <NumberInput
              icon="tabler:plug"
              label="inputs.monitor_port"
              max={65535}
              min={1}
              value={
                draft.monitor_port ??
                (draft.monitor_kind === 'minecraft' ? 25565 : 1)
              }
              onChange={monitor_port => setDraft({ ...draft, monitor_port })}
            />
          )}
          <NumberInput
            icon="lucide:clock"
            label="inputs.monitor_interval_seconds"
            max={86400}
            min={60}
            value={draft.monitor_interval_seconds}
            onChange={monitor_interval_seconds =>
              setDraft({ ...draft, monitor_interval_seconds })
            }
          />
        </Grid>
        <Flex align="center" gap="md">
          <Switch
            aria-label={t('inputs.monitor_enabled')}
            disabled={draft.monitor_kind === 'none'}
            value={draft.monitor_enabled}
            onChange={monitor_enabled =>
              setDraft({ ...draft, monitor_enabled })
            }
          />
          <Text>{t('inputs.monitor_enabled')}</Text>
        </Flex>
      </Stack>
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={
            !serviceInputSchema.safeParse(draft).success || !validMonitor
          }
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
