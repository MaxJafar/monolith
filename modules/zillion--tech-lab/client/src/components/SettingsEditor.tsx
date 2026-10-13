import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Grid, NumberInput, Text } from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { forgeAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import { type Settings, settingsInputSchema } from '../../../shared'

export function SettingsEditor({ settings }: { settings: Settings }) {
  const { t } = useModuleTranslation()
  const { pending, run } = useTechLab()
  const [source, setSource] = useState(settings)

  const [draft, setDraft] = useState(() =>
    settingsInputSchema.strip().parse(settings)
  )
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify(settingsInputSchema.strip().parse(source))

  const { blocker } = useDraftGuard(dirty)

  async function save() {
    const result = await run(() =>
      forgeAPI.settings.save.mutate({
        ...draft,
        expected_updated: source.updated
      })
    )

    if (result.ok) {
      setSource(result.value)
      setDraft(settingsInputSchema.strip().parse(result.value))
    }
  }

  return (
    <Card gap="md">
      <DraftNotice blocker={blocker} />
      <Text as="h2" size="xl" weight="semibold">
        {t('settings.title')}
      </Text>
      <Text color="muted">{t('settings.help')}</Text>
      {settings.updated !== source.updated && (
        <Text color="dangerous" role="alert">
          {t('messages.newerVersion')}
        </Text>
      )}
      <Grid gap="md" templateCols={{ base: 1, md: 3 }}>
        <NumberInput
          icon="lucide:refresh-cw"
          label="inputs.auto_refresh_seconds"
          max={300}
          min={15}
          value={draft.auto_refresh_seconds}
          onChange={auto_refresh_seconds =>
            setDraft({ ...draft, auto_refresh_seconds })
          }
        />
        <NumberInput
          icon="lucide:clock-alert"
          label="inputs.stale_after_multiplier"
          max={10}
          min={2}
          value={draft.stale_after_multiplier}
          onChange={stale_after_multiplier =>
            setDraft({ ...draft, stale_after_multiplier })
          }
        />
        <NumberInput
          icon="tabler:history"
          label="inputs.history_retention_days"
          max={90}
          min={7}
          value={draft.history_retention_days}
          onChange={history_retention_days =>
            setDraft({ ...draft, history_retention_days })
          }
        />
      </Grid>
      <Button
        disabled={!dirty || !settingsInputSchema.safeParse(draft).success}
        loading={pending}
        onClick={() => void save()}
      >
        save
      </Button>
    </Card>
  )
}
