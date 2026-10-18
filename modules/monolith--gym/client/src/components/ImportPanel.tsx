import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import { parseGymImport } from '../../../importers'
import { SelectInput } from './SelectInput'

export function ImportPanel() {
  const { data, pending, run } = useGym()
  const { t } = useModuleTranslation()
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [dateOrder, setDateOrder] = useState('')

  const [sourceUnit, setSourceUnit] = useState<'kg' | 'lb'>(
    () => data?.settings.unit ?? 'kg'
  )
  const [sourceTimezone, setSourceTimezone] = useState(
    () =>
      data?.settings.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [confirmation, setConfirmation] = useState('')

  const [preview, setPreview] = useState<ReturnType<
    typeof parseGymImport
  > | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [includeSchedule, setIncludeSchedule] = useState(false)
  const [includeSettings, setIncludeSettings] = useState(false)
  const [imported, setImported] = useState(false)

  function review() {
    if (!data) return

    try {
      const parsed = parseGymImport(text, {
        exercises: data.exercises,
        unit: sourceUnit,
        timezone: sourceTimezone,
        existingWorkouts: mode === 'replace' ? [] : data.workouts,
        existingBodyweight: mode === 'replace' ? [] : data.bodyweight,
        ...(dateOrder
          ? { dateOrder: dateOrder as 'day-first' | 'month-first' }
          : {})
      })
      setPreview(parsed)
      setError(null)
      setImported(false)
      setIncludeSchedule(false)
      setIncludeSettings(false)
    } catch (error) {
      setPreview(null)
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  async function upload(file: File) {
    setFilename(file.name)
    setPreview(null)
    setImported(false)
    setText(await file.text())
  }

  async function apply() {
    if (!preview || !window.confirm(t('import.confirm'))) return

    if (
      await run(() =>
        workspaceAPI.importData.mutate({
          command_id: crypto.randomUUID(),
          data: preview.data,
          include_schedule: includeSchedule,
          include_settings: includeSettings,
          mode,
          ...(mode === 'replace'
            ? { confirmation: 'REPLACE GYM' as const }
            : {})
        })
      )
    ) {
      setImported(true)
      setPreview(null)
      setText('')
    }
  }

  return (
    <Card gap="md">
      <Text as="h3" size="xl">
        {t('import.title')}
      </Text>
      <Text color="muted">{t('import.help')}</Text>
      <Box
        accept=".json,.csv,.xml,text/csv,application/json,application/xml,text/xml"
        aria-label={t('inputs.importFile')}
        as="input"
        type="file"
        onChange={event => {
          const file = event.currentTarget.files?.[0]

          if (file) void upload(file).catch(error => setError(String(error)))
        }}
      />
      {filename && <Text>{filename}</Text>}
      <SelectInput
        label="inputs.sourceUnit"
        options={[
          { value: 'kg', label: 'kg' },
          { value: 'lb', label: 'lb' }
        ]}
        value={sourceUnit}
        onChange={value => {
          setSourceUnit(value)
          setPreview(null)
        }}
      />
      <TextInput
        icon="tabler:world"
        label="inputs.sourceTimezone"
        placeholder=""
        value={sourceTimezone}
        onChange={value => {
          setSourceTimezone(value)
          setPreview(null)
        }}
      />
      <SelectInput
        label="inputs.dateOrder"
        options={[
          { value: '', label: t('import.unambiguous') },
          { value: 'day-first', label: t('import.dayFirst') },
          { value: 'month-first', label: t('import.monthFirst') }
        ]}
        value={dateOrder}
        onChange={value => {
          setDateOrder(value)
          setPreview(null)
        }}
      />
      <SelectInput
        label="inputs.importMode"
        options={[
          { value: 'merge', label: t('import.merge') },
          { value: 'replace', label: t('import.replace') }
        ]}
        value={mode}
        onChange={value => {
          setMode(value)
          setPreview(null)
          setConfirmation('')
        }}
      />
      <Button disabled={!text || pending} variant="secondary" onClick={review}>
        previewImport
      </Button>
      {error && (
        <Text color="dangerous" role="alert">
          {error}
        </Text>
      )}
      {imported && (
        <Text color="primary" role="status">
          {t('import.success')}
        </Text>
      )}
      {preview && (
        <Stack gap="md">
          <Text weight="semibold">{preview.source}</Text>
          <Text>{t('import.counts', preview.counts)}</Text>
          {preview.date_range && (
            <Text>
              {preview.date_range.from} – {preview.date_range.to}
            </Text>
          )}
          {!!preview.unmatched_names.length && (
            <Text whiteSpace="pre-line">
              {t('import.unmatched')} {preview.unmatched_names.join(', ')}
            </Text>
          )}
          <Stack maxHeight="18rem" overflowY="auto">
            {preview.warnings.map((warning, index) => (
              <Text key={index} color="dangerous">
                {warning.row ? `${warning.row}: ` : ''}
                {warning.message}
              </Text>
            ))}
          </Stack>
          {preview.has_schedule && (
            <Checkbox
              checked={includeSchedule}
              label={t('import.includeSchedule')}
              onCheckedChange={setIncludeSchedule}
            />
          )}
          {preview.has_settings && (
            <Checkbox
              checked={includeSettings}
              label={t('import.includeSettings')}
              onCheckedChange={setIncludeSettings}
            />
          )}
          {mode === 'replace' && (
            <Stack>
              <Text color="dangerous">{t('import.replaceWarning')}</Text>
              <TextInput
                icon="tabler:alert-triangle"
                label="inputs.replaceConfirmation"
                placeholder=""
                value={confirmation}
                onChange={setConfirmation}
              />
            </Stack>
          )}
          <Flex>
            <Button
              dangerous={mode === 'replace'}
              disabled={
                pending ||
                (mode === 'replace' && confirmation !== 'REPLACE GYM')
              }
              icon="tabler:upload"
              onClick={() => void apply()}
            >
              applyImport
            </Button>
          </Flex>
        </Stack>
      )}
    </Card>
  )
}
