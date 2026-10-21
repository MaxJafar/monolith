// SPDX-License-Identifier: 0BSD
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Card,
  ConfirmationModal,
  Flex,
  Listbox,
  ListboxOption,
  Pagination,
  SearchInput,
  Stack,
  Text,
  WithQuery,
  toast,
  useModalStore,
  usePersonalization
} from '@monolith/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'
import workspaceAPI from '@/core/utils/workspaceAPI'

import FontUploadDialog from './FontUploadDialog'
import {
  type CatalogFont,
  browseFonts,
  fontPreviewSource
} from './settingsModel'

const ns = 'common.personalization'
type CustomFont = Awaited<
  ReturnType<typeof workspaceAPI.fonts.custom.list.query>
>[number]
function Preview({ font }: { font: CatalogFont }) {
  const [family, setFamily] = useState('inherit')
  useEffect(() => {
    const source = fontPreviewSource(font.files)
    if (!source || typeof FontFace === 'undefined') return
    let active = true,
      loaded: FontFace | undefined
    const face = new FontFace('monolith-preview-' + font.family, source, {
      display: 'swap'
    })
    void face.load().then(
      value => {
        if (!active) return
        loaded = value
        document.fonts.add(value)
        setFamily(JSON.stringify(value.family))
      },
      () => {}
    )
    return () => {
      active = false
      if (loaded) document.fonts.delete(loaded)
    }
  }, [font])
  return (
    <Text as="p" size="xl" py="md" style={{ fontFamily: family }}>
      Aa Bb Cc · 0123456789
    </Text>
  )
}
function GoogleFonts() {
  const { t } = useTranslation(ns)
  const query = useQuery(workspaceAPI.fonts.google.list.queryOptions())
  const pins = useQuery(workspaceAPI.fonts.pins.list.queryOptions())
  const cache = useQueryClient(),
    ui = usePersonalization(),
    save = useUserPersonalization()
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [page, setPage] = useState(1),
    [pinning, setPinning] = useState<string | null>(null)
  const choices = Array.from(
    new Set(query.data?.items.map(font => font.category) ?? [])
  )
  const filtered = browseFonts(
    query.data?.items ?? [],
    search,
    category,
    pins.data ?? []
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    visiblePage = Math.min(page, pages)
  async function toggle(family: string) {
    if (pinning) return
    setPinning(family)
    try {
      await workspaceAPI.fonts.pins.toggle.mutate({ family })
      await cache.invalidateQueries({
        queryKey: workspaceAPI.fonts.pins.list.key
      })
    } catch {
      toast.error(t('monolith.requestFailed'))
    } finally {
      setPinning(null)
    }
  }
  return (
    <Stack gap="md">
      <Flex gap="sm" wrap="wrap">
        <SearchInput
          namespace={ns}
          searchTarget={t('monolith.fonts')}
          value={search}
          onChange={value => {
            setSearch(value)
            setPage(1)
          }}
        />
        <Listbox
          aria-label={t('monolith.category')}
          value={category}
          renderContent={value => value || t('monolith.allCategories')}
          onChange={value => {
            setCategory(value)
            setPage(1)
          }}
        >
          <ListboxOption value="" label={t('monolith.allCategories')} />
          {choices.map(value => (
            <ListboxOption key={value} value={value} label={value} />
          ))}
        </Listbox>
      </Flex>
      <WithQuery query={query}>
        {catalog =>
          catalog.enabled ? (
            <>
              {!filtered.length && (
                <Text color="muted">{t('monolith.noFonts')}</Text>
              )}
              {filtered
                .slice((visiblePage - 1) * 8, visiblePage * 8)
                .map(font => (
                  <section
                    key={font.family}
                    className="monolith-font-row"
                    data-selected={ui.fontFamily === font.family}
                  >
                    <Flex align="center" justify="between" gap="sm">
                      <Stack gap="xs">
                        <Text weight="semibold">{font.family}</Text>
                        <Text size="sm" color="muted">
                          {font.category} · {font.variants.length}{' '}
                          {t('monolith.variants')}
                        </Text>
                      </Stack>
                      <Flex gap="sm">
                        <Button
                          variant="plain"
                          icon={
                            pins.data?.includes(font.family)
                              ? 'tabler:star-filled'
                              : 'tabler:star'
                          }
                          aria-label={t('monolith.favorite')}
                          aria-pressed={
                            pins.data?.includes(font.family) ?? false
                          }
                          loading={pinning === font.family}
                          onClick={() => toggle(font.family)}
                        />
                        <Button
                          namespace={ns}
                          variant="secondary"
                          disabled={ui.fontFamily === font.family}
                          onClick={() => save.changeFontFamily(font.family)}
                        >
                          {ui.fontFamily === font.family
                            ? 'monolith.selected'
                            : 'monolith.useFont'}
                        </Button>
                      </Flex>
                    </Flex>
                    <Preview font={font} />
                  </section>
                ))}
              <Pagination
                page={visiblePage}
                totalPages={pages}
                onPageChange={setPage}
              />
            </>
          ) : (
            <Text color="muted">{t('monolith.googleSetup')}</Text>
          )
        }
      </WithQuery>
    </Stack>
  )
}
function UploadedFonts() {
  const { t } = useTranslation(ns)
  const query = useQuery(workspaceAPI.fonts.custom.list.queryOptions())
  const cache = useQueryClient(),
    modal = useModalStore(),
    ui = usePersonalization(),
    save = useUserPersonalization()
  const refresh = () =>
    cache.invalidateQueries({ queryKey: workspaceAPI.fonts.custom.list.key })
  function edit(font?: CustomFont) {
    modal.open(FontUploadDialog, { font, onSaved: refresh })
  }
  function remove(font: CustomFont) {
    modal.open(ConfirmationModal, {
      title: t('monolith.deleteFont'),
      description: font.displayName,
      confirmationButton: 'delete',
      onConfirm: async () => {
        await workspaceAPI.fonts.custom.remove
          .input({ id: font.id })
          .mutate(undefined)
        await refresh()
      }
    })
  }
  return (
    <Stack gap="md">
      <Button
        namespace={ns}
        variant="secondary"
        icon="tabler:upload"
        onClick={() => edit()}
      >
        monolith.uploadFont
      </Button>
      <WithQuery query={query}>
        {fonts => (
          <>
            {!fonts.length && (
              <Text color="muted">{t('monolith.noUploads')}</Text>
            )}
            {fonts.map(font => (
              <section
                className="monolith-font-row"
                key={font.id}
                data-selected={ui.fontFamily === 'custom:' + font.id}
              >
                <Flex align="center" justify="between" gap="md" wrap="wrap">
                  <Stack gap="xs">
                    <Text weight="semibold">{font.displayName}</Text>
                    <Text color="muted" size="sm">
                      {font.family} · {font.weight}
                    </Text>
                  </Stack>
                  <Flex gap="sm" wrap="wrap">
                    <Button
                      namespace={ns}
                      variant="secondary"
                      disabled={ui.fontFamily === 'custom:' + font.id}
                      onClick={() => save.changeFontFamily('custom:' + font.id)}
                    >
                      monolith.useFont
                    </Button>
                    <Button
                      namespace={ns}
                      variant="plain"
                      onClick={() => edit(font)}
                    >
                      monolith.edit
                    </Button>
                    <Button
                      namespace={ns}
                      variant="plain"
                      dangerous
                      disabled={ui.fontFamily === 'custom:' + font.id}
                      onClick={() => remove(font)}
                    >
                      monolith.remove
                    </Button>
                  </Flex>
                </Flex>
              </section>
            ))}
          </>
        )}
      </WithQuery>
    </Stack>
  )
}
export default function FontSettings() {
  const { t } = useTranslation(ns),
    ui = usePersonalization(),
    save = useUserPersonalization()
  const [source, setSource] = useState('google')
  return (
    <Card>
      <Stack gap="lg">
        <Flex align="center" justify="between" gap="sm" wrap="wrap">
          <Text as="h2" size="lg" weight="semibold">
            {t('monolith.fonts')}
          </Text>
          <Button
            namespace={ns}
            variant="plain"
            disabled={ui.fontFamily === 'Inter'}
            onClick={() => save.changeFontFamily('Inter')}
          >
            monolith.defaultFont
          </Button>
        </Flex>
        <Listbox
          aria-label={t('monolith.fontSource')}
          value={source}
          renderContent={value =>
            value === 'google' ? 'Google Fonts' : t('monolith.uploads')
          }
          onChange={setSource}
        >
          <ListboxOption value="google" label="Google Fonts" />
          <ListboxOption value="custom" label={t('monolith.uploads')} />
        </Listbox>
        {source === 'google' ? <GoogleFonts /> : <UploadedFonts />}
      </Stack>
    </Card>
  )
}
