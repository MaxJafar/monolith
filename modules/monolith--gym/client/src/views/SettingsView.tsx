import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
  NumberInput,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import { type Settings, settingsInputSchema } from '../../../shared'
import { ImportPanel } from '../components/ImportPanel'
import { NotificationSettings } from '../components/NotificationSettings'
import OfflineSettings from '../components/OfflineSettings'
import { SelectInput } from '../components/SelectInput'
import { DraftNotice, useDraftGuard } from '../useDraftGuard'
import { playBeep } from '../utils/sound'
import { downloadJson } from '../utils/workout'

export default function SettingsView() {
  const { data, run, pending, navigate } = useGym()
  const { t } = useModuleTranslation()
  const [source, setSource] = useState(() => data!.settings)
  const [draft, setDraft] = useState(source)
  const [capability, setCapability] = useState('')
  const [resetConfirmation, setResetConfirmation] = useState('')

  const dirty = JSON.stringify(draft) !== JSON.stringify(source)

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  if (!data) return null

  async function save() {
    let result: Settings | undefined

    if (
      await run(async () => {
        result = await workspaceAPI.updateSettings.mutate({
          ...settingsInputSchema.parse(draft),
          expected_revision: source.revision
        })
      })
    ) {
      if (result) {
        setSource(result)
        setDraft(result)
      }
    }
  }

  async function notifications() {
    if (!('Notification' in window)) {
      setCapability(t('settings.notificationsUnsupported'))

      return
    }

    const permission = await Notification.requestPermission()
    setCapability(t(`settings.notificationPermission.${permission}`))
    if (permission === 'granted')
      new Notification(t('settings.notificationTitle'), {
        body: t('settings.notificationTest')
      })
  }

  return (
    <Stack gap="lg">
      <DraftNotice blocker={blocker} />
      <Card gap="md">
        <Text as="h2" size="2xl" weight="semibold">
          {t('sections.settings')}
        </Text>
        <Text color="muted">{t('settings.hostAppearance')}</Text>
        {source.revision !== data.settings.revision && (
          <Text color="dangerous" role="alert">
            {t('messages.staleDraft')}
          </Text>
        )}
        <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
          <SelectInput
            label="inputs.unit"
            options={(['kg', 'lb'] as const).map(value => ({
              value,
              label: value
            }))}
            value={draft.unit}
            onChange={unit => setDraft({ ...draft, unit })}
          />
          <SelectInput
            label="inputs.effort"
            options={(['none', 'rir', 'rpe'] as const).map(value => ({
              value,
              label: t(`effort.${value}`)
            }))}
            value={draft.effort}
            onChange={effort => setDraft({ ...draft, effort })}
          />
          <NumberInput
            icon="tabler:clock"
            label="inputs.rest_seconds"
            max={3600}
            min={0}
            value={draft.rest_seconds}
            onChange={rest_seconds => setDraft({ ...draft, rest_seconds })}
          />
          <SelectInput
            label="inputs.formula"
            options={(['epley', 'brzycki', 'lombardi'] as const).map(value => ({
              value,
              label: t(`formulas.${value}`)
            }))}
            value={draft.formula}
            onChange={formula => setDraft({ ...draft, formula })}
          />
          <SelectInput
            label="inputs.bodyStyle"
            options={(['male', 'female'] as const).map(value => ({
              value,
              label: t(`bodyStyle.${value}`)
            }))}
            value={draft.body_style}
            onChange={body_style => setDraft({ ...draft, body_style })}
          />
        </Grid>
        <Text color="muted">{t('settings.effortHelp')}</Text>
        <Flex gap="lg" wrap="wrap">
          <Checkbox
            checked={draft.sound}
            label={t('settings.sound')}
            onCheckedChange={sound => setDraft({ ...draft, sound })}
          />
          <Checkbox
            checked={draft.keep_awake}
            label={t('settings.keepAwake')}
            onCheckedChange={keep_awake => setDraft({ ...draft, keep_awake })}
          />
        </Flex>
        <Flex gap="sm" wrap="wrap">
          <Button
            variant="secondary"
            onClick={() =>
              setCapability(
                t(
                  playBeep()
                    ? 'settings.soundPlayed'
                    : 'settings.soundUnavailable'
                )
              )
            }
          >
            testSound
          </Button>
          <Button
            disabled={!dirty || !settingsInputSchema.safeParse(draft).success}
            loading={pending}
            onClick={() => void save()}
          >
            save
          </Button>
          <Button
            disabled={pending}
            variant="secondary"
            onClick={() => {
              if (!dirty || window.confirm(t('messages.discardChanges'))) {
                setSource(data.settings)
                setDraft(data.settings)
              }
            }}
          >
            reloadDraft
          </Button>
        </Flex>
      </Card>
      <Card gap="md">
        <Text as="h3" size="xl">
          {t('settings.reminders')}
        </Text>
        <Checkbox
          checked={draft.reminder_enabled}
          label={t('settings.enableReminder')}
          onCheckedChange={reminder_enabled =>
            setDraft({ ...draft, reminder_enabled })
          }
        />
        <TextInput
          icon="tabler:clock"
          label="inputs.reminderTime"
          placeholder=""
          value={draft.reminder_time}
          onChange={reminder_time => setDraft({ ...draft, reminder_time })}
        />
        <TextInput
          icon="tabler:world"
          label="inputs.timezone"
          placeholder=""
          value={draft.timezone}
          onChange={timezone => setDraft({ ...draft, timezone })}
        />
        <Text color="muted">{t('settings.reminderHelp')}</Text>
        <Button variant="secondary" onClick={() => void notifications()}>
          testNotifications
        </Button>
        <Button
          disabled={!dirty || !settingsInputSchema.safeParse(draft).success}
          loading={pending}
          onClick={() => void save()}
        >
          save
        </Button>
      </Card>
      {capability && <Text role="status">{capability}</Text>}
      <NotificationSettings />
      <OfflineSettings />
      <Card gap="md">
        <Text as="h3" size="xl">
          {t('settings.backup')}
        </Text>
        <Text color="muted">{t('settings.backupHelp')}</Text>
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={pending}
            icon="tabler:download"
            variant="secondary"
            onClick={() =>
              void run(async () =>
                downloadJson(
                  await workspaceAPI.exportData.input({ scope: 'all' }).query(),
                  'zillion-gym-backup.json'
                )
              )
            }
          >
            exportBackup
          </Button>
          <Button
            disabled={pending}
            icon="tabler:download"
            variant="secondary"
            onClick={() =>
              void run(async () =>
                downloadJson(
                  await workspaceAPI.exportData.input({ scope: 'plan' }).query(),
                  'zillion-gym-plan.json'
                )
              )
            }
          >
            exportPlan
          </Button>
        </Flex>
      </Card>
      <ImportPanel />
      <Card gap="md">
        <Text as="h3" size="xl">
          {t('settings.resetTitle')}
        </Text>
        <Text color="dangerous">{t('settings.resetWarning')}</Text>
        <TextInput
          icon="tabler:alert-triangle"
          label="inputs.resetConfirmation"
          placeholder=""
          value={resetConfirmation}
          onChange={setResetConfirmation}
        />
        <Button
          dangerous
          disabled={pending || resetConfirmation !== 'RESET GYM'}
          onClick={() => {
            if (window.confirm(t('settings.resetConfirm')))
              void run(() =>
                workspaceAPI.resetData.mutate({
                  command_id: crypto.randomUUID(),
                  confirmation: 'RESET GYM'
                })
              ).then(success => {
                if (success) {
                  allowNavigation()
                  navigate('dashboard')
                }
              })
          }}
        >
          resetData
        </Button>
      </Card>
    </Stack>
  )
}
