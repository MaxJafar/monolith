import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type Appearance, styledIcon } from '@monolith/blocks'

import { Button } from '@/components/inputs'
import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Flex, Grid, Stack, Text } from '@/components/primitives'
import { useAppearance } from '@/providers/AppearanceProvider'
import { useModalStore } from '@/providers/ModalProvider'

import { coverColors, uploadCoverFile, useCoverPicker } from './CoverPicker'
import './cover.css'

const quickIcons = [
  'file-text',
  'notebook-pen',
  'house',
  'folder',
  'calendar-days',
  'database',
  'kanban',
  'sparkles',
  'layers',
  'star',
  'heart',
  'rocket'
]

/** Page icon and cover choices; the full appearance builder keeps everything else. */
function AppearancePopover({
  anchor,
  onClose
}: {
  anchor: HTMLElement | null
  onClose: () => void
}) {
  const { appearance, changeIcon, changeCover } = useAppearance()
  const { t } = useTranslation('common.appearance')
  const { open } = useModalStore()
  const pickCover = useCoverPicker()
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function apply(change: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      await change()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const setIcon = (icon: Appearance['icon']) =>
    apply(async () => changeIcon?.(icon))
  const setCover = (cover: Appearance['cover']) =>
    apply(async () => changeCover?.(cover))

  return (
    <FloatingPopover
      anchor={anchor}
      className="appearance-popover"
      label={t('customize')}
      width={292}
      onClose={onClose}
    >
      <Stack gap="md">
        <Stack gap="xs">
          <Text color="muted" size="xs" weight="medium">
            {t('icon')}
          </Text>
          <Grid gap="xs" templateCols={6}>
            {quickIcons.map(name => {
              const icon = styledIcon(`lucide:${name}`, appearance.iconSet)

              return (
                <Button
                  key={name}
                  aria-label={name}
                  aria-pressed={appearance.icon === icon}
                  disabled={busy}
                  icon={icon}
                  iconProps={{ preserveStyle: true }}
                  namespace={false}
                  variant="plain"
                  onClick={() => void setIcon(icon)}
                />
              )
            })}
          </Grid>
          <Flex gap="xs" wrap="wrap">
            <Button
              disabled={busy}
              icon="lucide:search"
              namespace={false}
              variant="plain"
              onClick={() => {
                onClose()
                // The full picker is large; load it only when it is needed.
                void import('@/components/inputs/IconInput/IconPickerModal').then(
                  ({ IconPickerModal }) =>
                    open(IconPickerModal, {
                      setSelectedIcon: icon => void changeIcon?.(icon)
                    })
                )
              }}
            >
              {t('moreIcons')}
            </Button>
            {appearance.icon && (
              <Button
                disabled={busy}
                namespace={false}
                variant="plain"
                onClick={() => void setIcon(undefined)}
              >
                {t('removeIcon')}
              </Button>
            )}
          </Flex>
        </Stack>
        <Stack gap="xs">
          <Text color="muted" size="xs" weight="medium">
            {t('cover')}
          </Text>
          <Grid gap="xs" templateCols={6}>
            {coverColors.map(color => (
              <button
                key={color}
                aria-label={`${t('coverColor')} ${color}`}
                aria-pressed={
                  appearance.cover?.type === 'color' &&
                  appearance.cover.value === color
                }
                className="appearance-popover-swatch"
                disabled={busy}
                style={{ backgroundColor: color }}
                type="button"
                onClick={() => void setCover({ type: 'color', value: color })}
              />
            ))}
          </Grid>
          <Flex gap="xs" wrap="wrap">
            <Button
              disabled={busy}
              icon="lucide:upload"
              namespace={false}
              variant="plain"
              onClick={() => file.current?.click()}
            >
              {t('uploadCover')}
            </Button>
            <Button
              disabled={busy}
              icon="lucide:link"
              namespace={false}
              variant="plain"
              onClick={() => {
                onClose()
                pickCover(appearance.cover, cover => changeCover?.(cover))
              }}
            >
              {t('moreCoverOptions')}
            </Button>
            {appearance.cover && (
              <Button
                disabled={busy}
                namespace={false}
                variant="plain"
                onClick={() => void setCover(null)}
              >
                {t('removeCover')}
              </Button>
            )}
          </Flex>
          <input
            ref={file}
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label={t('uploadCover')}
            type="file"
            onChange={event => {
              const selected = event.target.files?.[0]
              event.target.value = ''
              if (!selected) return
              void apply(async () => {
                const cover = await uploadCoverFile(selected)

                if (!cover) throw Error(t('uploadLimit'))
                await changeCover?.(cover)
              })
            }}
          />
        </Stack>
        {error && (
          <Text color="dangerous" role="alert" size="xs">
            {error}
          </Text>
        )}
      </Stack>
    </FloatingPopover>
  )
}

/** Opens the page icon and cover popover where the page can save them inline,
 * and falls back to the full appearance builder elsewhere. */
export function useAppearancePopover() {
  const { changeIcon, changeCover, openEditor } = useAppearance()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const inline = !!changeIcon && !!changeCover

  return {
    toggle: (target: HTMLElement) =>
      inline
        ? setAnchor(current => (current ? null : target))
        : openEditor?.('page'),
    popover: inline && anchor && (
      <AppearancePopover anchor={anchor} onClose={() => setAnchor(null)} />
    )
  }
}
