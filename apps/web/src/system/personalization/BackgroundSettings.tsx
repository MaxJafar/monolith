// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import {
  Button,
  Card,
  ConfirmationModal,
  FilePickerModal,
  Flex,
  Listbox,
  ListboxOption,
  SliderInput,
  Stack,
  Text,
  useModalStore,
  usePersonalization
} from '@monolith/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'
import workspaceAPI from '@/core/utils/workspaceAPI'

import { blurSteps, defaultFilters } from './settingsModel'

const ns = 'common.personalization'
export default function BackgroundSettings() {
  const ui = usePersonalization(),
    save = useUserPersonalization(),
    modal = useModalStore()
  const { userData, setUserData } = useAuth()
  const { t } = useTranslation(ns)
  const [draft, setDraft] = useState(ui.backdropFilters)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(ui.backdropFilters), [ui.backdropFilters])
  const owner = userData?.id
  const currentOwner = useRef(owner)
  currentOwner.current = owner
  function pick() {
    modal.open(FilePickerModal, {
      mimeTypes: { image: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      sources: {
        url: true,
        pixabay: true,
        ai: {
          defaultPrompt:
            'A quiet architectural scene with soft light, restrained colors and open space. Wide landscape composition.'
        }
      },
      onSelect: async file => {
        if (!owner || currentOwner.current !== owner)
          throw new Error(t('monolith.requestFailed'))
        const image =
          await workspaceAPI.user.personalization.updateBgImage.mutate({ file })
        setUserData(previous =>
          previous && previous.id === owner
            ? { ...previous, bgImage: image }
            : previous
        )
      }
    })
  }
  function remove() {
    modal.open(ConfirmationModal, {
      title: t('monolith.removeBackground'),
      description: t('monolith.removeBackgroundHelp'),
      confirmationButton: 'delete',
      onConfirm: async () => {
        if (!owner || currentOwner.current !== owner)
          throw new Error(t('monolith.requestFailed'))
        await workspaceAPI.user.personalization.deleteBgImage.mutate(undefined)
        setUserData(previous =>
          previous && previous.id === owner
            ? { ...previous, bgImage: null, backdropFilters: defaultFilters }
            : previous
        )
      }
    })
  }
  async function apply() {
    setSaving(true)
    try {
      await save.changeBackdropFilters(draft)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Card>
      <Stack gap="md">
        <Flex justify="between" align="center" gap="md" wrap="wrap">
          <Text as="h2" size="lg" weight="semibold">
            {t('monolith.background')}
          </Text>
          <Flex gap="sm">
            <Button
              namespace={ns}
              variant="secondary"
              icon="tabler:photo"
              onClick={pick}
            >
              monolith.chooseImage
            </Button>
            {ui.bgImage && (
              <Button namespace={ns} variant="plain" dangerous onClick={remove}>
                monolith.remove
              </Button>
            )}
          </Flex>
        </Flex>
        {ui.bgImage && (
          <>
            <div className="monolith-background-preview">
              <img
                alt=""
                src={ui.bgImage}
                style={{
                  filter:
                    'blur(' +
                    blurSteps[draft.blur] +
                    'px) brightness(' +
                    draft.brightness +
                    '%) contrast(' +
                    draft.contrast +
                    '%) saturate(' +
                    draft.saturation +
                    '%)'
                }}
              />
              <span
                className="monolith-background-overlay"
                style={{ opacity: draft.overlayOpacity / 100 }}
              />
              <Text className="monolith-background-caption">
                {t('monolith.preview')}
              </Text>
            </div>
            <div className="monolith-adjustment-grid">
              <Stack gap="sm">
                <Text size="sm">{t('monolith.blur')}</Text>
                <Listbox
                  aria-label={t('monolith.blur')}
                  value={draft.blur}
                  renderContent={value => blurSteps[value] + 'px'}
                  onChange={blur => setDraft({ ...draft, blur })}
                >
                  {Object.entries(blurSteps).map(([key, value]) => (
                    <ListboxOption key={key} value={key} label={value + 'px'} />
                  ))}
                </Listbox>
              </Stack>
              {(
                [
                  'brightness',
                  'contrast',
                  'saturation',
                  'overlayOpacity'
                ] as const
              ).map(field => (
                <SliderInput
                  key={field}
                  namespace={ns}
                  label={'monolith.' + field}
                  min={0}
                  max={field === 'overlayOpacity' ? 100 : 200}
                  value={draft[field]}
                  onChange={value => setDraft({ ...draft, [field]: value })}
                />
              ))}
            </div>
            <Flex gap="sm" justify="end">
              <Button
                namespace={ns}
                variant="plain"
                onClick={() => setDraft(defaultFilters)}
              >
                monolith.reset
              </Button>
              <Button namespace={ns} loading={saving} onClick={apply}>
                monolith.save
              </Button>
            </Flex>
          </>
        )}
      </Stack>
    </Card>
  )
}
