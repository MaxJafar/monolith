import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  FileInput,
  type FileValue,
  Flex,
  Grid,
  Stack,
  Text,
  TextAreaInput
} from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { SelectInput } from '@/components/SelectInput'
import { forgeAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import type {
  TechLabImportPreview,
  TechLabImportSummary
} from '../../../shared'

const formats = [
  'native-json',
  'homepage-services',
  'homepage-bookmarks'
] as const

const maxSourceSize = 1024 * 1024

export function InventoryImport() {
  const { t } = useModuleTranslation()
  const { data, pending, run } = useTechLab()
  const [format, setFormat] = useState<(typeof formats)[number]>('native-json')
  const [text, setText] = useState('')
  const [file, setFile] = useState<FileValue>({ type: 'empty' })
  const [preview, setPreview] = useState<TechLabImportPreview | null>(null)
  const [summary, setSummary] = useState<TechLabImportSummary | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const generation = useRef(0)
  const { blocker } = useDraftGuard(!!text)

  useEffect(
    () => () => {
      generation.current++
    },
    []
  )

  function changeText(value: string) {
    generation.current++
    setText(value)
    setFileError(null)
    setPreview(null)
    setSummary(null)
  }

  async function selectFile(value: FileValue) {
    generation.current++
    const request = generation.current
    setFile(value)
    setPreview(null)
    setSummary(null)
    setFileError(null)

    if (value.type === 'empty') {
      setText('')

      return
    }
    if (value.type !== 'upload') return

    if (value.file.size > maxSourceSize) {
      setFileError(t('import.tooLarge'))

      return
    }

    try {
      const contents = await value.file.text()

      if (request === generation.current) setText(contents)
    } catch {
      if (request === generation.current) setFileError(t('import.readFailed'))
    }
  }

  async function review() {
    if (text.length > maxSourceSize || fileError) return

    const request = generation.current
    setPreview(null)
    const result = await run(() =>
      forgeAPI.imports.preview.mutate({ format, text })
    )

    if (result.ok && request === generation.current) setPreview(result.value)
  }

  async function apply() {
    if (!preview) return

    const request = generation.current
    const result = await run(() =>
      forgeAPI.imports.apply.mutate({ data: preview.data })
    )

    if (result.ok && request === generation.current) {
      setSummary(result.value)
      setPreview(null)
      setText('')
      setFile({ type: 'empty' })
    }
  }

  async function download() {
    const result = await run(() => forgeAPI.exportData.query())

    if (!result.ok) return

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result.value, null, 2)], {
        type: 'application/json'
      })
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `zillion-tech-lab-${dayjs().format('YYYY-MM-DD')}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (!data) return null

  return (
    <Stack gap="lg">
      <DraftNotice blocker={blocker} />
      <Card gap="md">
        <Text as="h2" size="xl" weight="semibold">
          {t('import.title')}
        </Text>
        <Text color="muted">{t('import.help')}</Text>
        <SelectInput
          disabled={pending}
          label="inputs.format"
          options={formats.map(value => ({
            value,
            label: t(`import.formats.${value}`)
          }))}
          value={format}
          onChange={value => {
            generation.current++
            setFormat(value)
            setPreview(null)
            setSummary(null)
          }}
        />
        <FileInput
          disabled={pending}
          icon="lucide:file-input"
          label="inputs.file"
          value={file}
          onChange={value => void selectFile(value)}
        />
        {fileError && (
          <Text color="dangerous" role="alert">
            {fileError}
          </Text>
        )}
        <TextAreaInput
          disabled={pending}
          icon="tabler:code"
          label="inputs.source"
          placeholder=""
          value={text}
          onChange={changeText}
        />
        {text.length > maxSourceSize && (
          <Text color="dangerous" role="alert">
            {t('import.tooLarge')}
          </Text>
        )}
        <Flex gap="sm" wrap="wrap">
          <Button
            disabled={
              !text.trim() || text.length > maxSourceSize || !!fileError
            }
            icon="tabler:scan"
            loading={pending}
            onClick={() => void review()}
          >
            previewImport
          </Button>
          <Button
            disabled={pending}
            variant="plain"
            onClick={() => {
              changeText('')
              setFile({ type: 'empty' })
              setFileError(null)
            }}
          >
            clear
          </Button>
        </Flex>
      </Card>
      {preview && (
        <Card gap="md">
          <Text as="h3" size="xl" weight="semibold">
            {t('import.review')}
          </Text>
          <Grid gap="md" templateCols={{ base: 2, md: 4 }}>
            {Object.entries(preview.counts).map(([key, value]) => (
              <Stack key={key} gap="xs">
                <Text color="muted">{t(`import.counts.${key}`)}</Text>
                <Text size="2xl" weight="semibold">
                  {value}
                </Text>
              </Stack>
            ))}
          </Grid>
          <Text>{t('import.monitorsDisabled')}</Text>
          {!!preview.warnings.length && (
            <Stack as="ul" gap="sm">
              {preview.warnings.map((warning, index) => (
                <Text key={index} as="li">
                  {warning}
                </Text>
              ))}
            </Stack>
          )}
          <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
            <Stack
              aria-label={t('sections.devices')}
              gap="sm"
              maxHeight="20rem"
              overflow="auto"
              role="region"
              tabIndex={0}
            >
              <Text weight="semibold">{t('sections.devices')}</Text>
              {preview.data.devices.map((device, index) => (
                <Text key={index}>
                  {device.name} · {device.kind}
                </Text>
              ))}
            </Stack>
            <Stack
              aria-label={t('sections.services')}
              gap="sm"
              maxHeight="20rem"
              overflow="auto"
              role="region"
              tabIndex={0}
            >
              <Text weight="semibold">{t('sections.services')}</Text>
              {preview.data.services.map((service, index) => (
                <Text key={index}>
                  {service.name} · {t(`kinds.${service.kind}`)}
                  {service.category ? ` · ${service.category}` : ''}
                </Text>
              ))}
            </Stack>
          </Grid>
          <Button
            disabled={
              !preview.data.devices.length && !preview.data.services.length
            }
            icon="lucide:database-backup"
            loading={pending}
            onClick={() => void apply()}
          >
            applyImport
          </Button>
        </Card>
      )}
      {summary && (
        <Card gap="md" role="status">
          <Text weight="semibold">
            {t('import.applied', {
              devices: summary.created.devices,
              services: summary.created.services
            })}
          </Text>
          <Text color="muted">
            {t('import.skipped', {
              devices: summary.skipped.devices,
              services: summary.skipped.services
            })}
          </Text>
          {summary.warnings.map((warning, index) => (
            <Text key={index}>{warning}</Text>
          ))}
        </Card>
      )}
      <Card gap="md">
        <Text as="h2" size="xl" weight="semibold">
          {t('import.export')}
        </Text>
        <Text color="muted">{t('import.exportHelp')}</Text>
        <Button
          icon="lucide:download"
          loading={pending}
          variant="secondary"
          onClick={() => void download()}
        >
          exportInventory
        </Button>
      </Card>
    </Stack>
  )
}
