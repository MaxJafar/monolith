import { type Appearance, appearanceSchema } from '@monolith/blocks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, ChoiceSelect } from '@/components/inputs'
import { Flex, Grid, Stack, Text } from '@/components/primitives'
import { useModalStore } from '@/providers/ModalProvider'
import { workspaceAPI } from '@/utils/workspaceAPI'

import './cover.css'

type Cover = Appearance['cover']
export const coverColors = [
  '#d8dfd0',
  '#b9c8be',
  '#628582',
  '#2e5159',
  '#e9dac5',
  '#c5a789',
  '#af7759',
  '#693e45',
  '#e0cbd5',
  '#b7bce0',
  '#777fab',
  '#3c4165'
]
const coverFileTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Uploads an accepted cover image; undefined means the file type or size was rejected. */
export async function uploadCoverFile(file: File): Promise<Cover | undefined> {
  if (!coverFileTypes.includes(file.type) || file.size > 5_000_000) return

  const image = await workspaceAPI.user.personalization.uploadCover.mutate({
    file
  })
  return { type: 'image', value: '', fileKey: image.key, position: 50 }
}

export function CoverPicker({
  value,
  onChange,
  disabled = false
}: {
  value: Cover
  onChange: (value: Cover) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('common.appearance')
  const [tab, setTab] = useState('gallery')
  const [url, setUrl] = useState(value?.type === 'image' ? value.value : '')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const valid = appearanceSchema.shape.cover.safeParse({
    type: 'image',
    value: url,
    position: 50
  }).success
  return (
    <Stack gap="md" className="cover-picker">
      <Flex gap="xs" role="tablist" aria-label={t('cover')}>
        {['gallery', 'upload', 'link'].map(id => (
          <Button
            key={id}
            role="tab"
            aria-selected={id === tab}
            namespace={false}
            variant={id === tab ? 'secondary' : 'plain'}
            onClick={() => setTab(id)}
          >
            {t(`picker.${id}`)}
          </Button>
        ))}
      </Flex>
      {tab === 'gallery' && (
        <Grid templateCols={4} gap="sm">
          {coverColors.map(color => (
            <button
              key={color}
              type="button"
              disabled={disabled}
              className="cover-swatch"
              aria-label={`${t('coverColor')} ${color}`}
              aria-pressed={value?.type === 'color' && value.value === color}
              style={{ backgroundColor: color }}
              onClick={() => onChange({ type: 'color', value: color })}
            />
          ))}
        </Grid>
      )}
      {tab === 'upload' && (
        <Stack gap="sm">
          <input
            type="file"
            aria-label={t('uploadCover')}
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={disabled || uploading}
            onChange={async event => {
              const file = event.target.files?.[0]
              if (!file) return
              setUploading(true)
              setError('')
              try {
                const cover = await uploadCoverFile(file)
                if (cover) onChange(cover)
                else setError(t('uploadLimit'))
              } catch (cause) {
                setError(String(cause))
              } finally {
                setUploading(false)
              }
            }}
          />
          <Text size="xs" color="muted">
            {t(uploading ? 'uploading' : 'uploadLimit')}
          </Text>
        </Stack>
      )}
      {tab === 'link' && (
        <Flex gap="sm">
          <input
            className="cover-link"
            type="url"
            aria-label={t('coverUrl')}
            placeholder="https://"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <Button
            namespace={false}
            disabled={disabled || !valid}
            onClick={() =>
              onChange({ type: 'image', value: url, position: 50 })
            }
          >
            {t('picker.apply')}
          </Button>
        </Flex>
      )}
      {value?.type === 'image' && (
        <label>
          {t('coverPosition')}
          <input
            aria-label={t('coverPosition')}
            type="range"
            min={0}
            max={100}
            value={value.position}
            disabled={disabled}
            onChange={e =>
              onChange({ ...value, position: Number(e.target.value) })
            }
          />
        </label>
      )}
      <ChoiceSelect
        label={t('coverType')}
        value={
          value === undefined ? 'inherit' : value === null ? 'none' : value.type
        }
        options={['inherit', 'none', 'color', 'image'].map(id => ({
          value: id,
          label: t(`coverTypes.${id}`)
        }))}
        onChange={id => {
          if (id === 'none') onChange(null)
          else if (id === 'inherit') onChange(undefined)
          else if (id === 'color')
            onChange({ type: 'color', value: coverColors[0]! })
          else setTab('link')
        }}
        disabled={disabled}
      />
      {error && (
        <Text role="alert" color="dangerous">
          {error}
        </Text>
      )}
    </Stack>
  )
}

function CoverDialog({
  data,
  onClose
}: {
  data: { value: Cover; onChange: (value: Cover) => void | Promise<void> }
  onClose: () => void
}) {
  const { t } = useTranslation('common.appearance')
  const [value, setValue] = useState(data.value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  return (
    <Stack
      className="cover-dialog"
      gap="md"
      role="dialog"
      aria-label={t('changeCover')}
    >
      <Flex justify="between" align="center">
        <Text weight="semibold">{t('changeCover')}</Text>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:x"
          aria-label={t('close')}
          onClick={onClose}
        />
      </Flex>
      <CoverPicker value={value} onChange={setValue} disabled={busy} />
      {error && <Text role="alert">{error}</Text>}
      <Button
        namespace={false}
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await data.onChange(value)
            onClose()
          } catch (cause) {
            setError(String(cause))
          } finally {
            setBusy(false)
          }
        }}
      >
        {t('picker.apply')}
      </Button>
    </Stack>
  )
}
export function useCoverPicker() {
  const { open } = useModalStore()
  return (value: Cover, onChange: (value: Cover) => void | Promise<void>) =>
    open(CoverDialog, { value, onChange })
}
