import {
  type Appearance,
  type AppearanceScope,
  appearanceSchema,
  fontFamilies,
  fontProviders,
  iconProviders,
  resolveAppearance,
  styledIcon
} from '@monolith/blocks'
import {
  Box,
  Button,
  ChoiceSelect,
  ColorInput,
  CoverPicker,
  Flex,
  Grid,
  IconInput,
  Stack,
  Text,
  useModalStore
} from '@monolith/ui'
import {
  type ReactNode,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useBeforeUnload } from 'react-router'

import '../overlays/overlays.css'
import { useAppAppearance } from './AppearanceContext'
import { AppearancePreview } from './AppearancePreview'

type BuilderProps = {
  data: { initialScope: AppearanceScope }
  onClose: () => void
}

const palettes = [
  {
    id: 'paper',
    background: '#ffffff',
    accent: '#252525',
    button: '#252525',
    icons: '#73736f'
  },
  {
    id: 'sage',
    background: '#f4f7f2',
    accent: '#486346',
    button: '#486346',
    icons: '#65825f'
  },
  {
    id: 'ocean',
    background: '#f3f7fc',
    accent: '#285d91',
    button: '#285d91',
    icons: '#467db1'
  },
  {
    id: 'rose',
    background: '#fff5f4',
    accent: '#a44d65',
    button: '#a44d65',
    icons: '#b9687f'
  },
  {
    id: 'midnight',
    background: '#171d29',
    accent: '#a8bcf3',
    button: '#a8bcf3',
    icons: '#95addc'
  },
  {
    id: 'sand',
    background: '#faf5eb',
    accent: '#876239',
    button: '#876239',
    icons: '#a27a4c'
  }
] as const

function Field({ label, children }: { label: string; children: ReactNode }) {
  const field = isValidElement<{ 'aria-label'?: string }>(children)
    ? cloneElement(children, { 'aria-label': label })
    : children

  return (
    <Stack as="label" gap="xs">
      <Text size="sm" weight="medium">
        {label}
      </Text>
      {field}
    </Stack>
  )
}

export default function AppearanceBuilder(props: BuilderProps) {
  const state = useAppAppearance()
  const { t } = useTranslation('common.appearance')

  if (!state.ready)
    return (
      <Stack gap="md">
        <Text role={state.error ? 'alert' : 'status'}>
          {state.error || t('loading')}
        </Text>
        {state.error && (
          <Button
            namespace={false}
            onClick={() => state.reload().catch(() => undefined)}
          >
            {t('retry')}
          </Button>
        )}
        <Button namespace={false} variant="plain" onClick={props.onClose}>
          {t('close')}
        </Button>
      </Stack>
    )

  return <AppearanceEditor {...props} />
}

function AppearanceEditor({ data, onClose }: BuilderProps) {
  const state = useAppAppearance()
  const { t } = useTranslation('common.appearance')
  const { stack } = useModalStore()

  const [target] = useState(() => ({
    accountId: state.accountId,
    workspaceId: state.workspaceId,
    pageKey: state.pageKey
  }))
  const [baseline, setBaseline] = useState<Record<AppearanceScope, Appearance>>(
    () => ({
      global: state.global,
      workspace: state.workspace,
      page: state.pages[state.pageKey] ?? {}
    })
  )

  const [drafts, setDrafts] = useState(baseline)

  const [revisions, setRevisions] = useState({
    global: state.globalRevision,
    workspace: state.workspaceRevision
  })

  const [scope, setScope] = useState(data.initialScope)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState<'close' | 'reload' | null>(null)
  const lock = useRef(false)
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const mounted = useRef(true)

  const isTop =
    [...stack].reverse().find(modal => !modal.isClosing)?.data === data
  const changedTarget =
    target.accountId !== state.accountId ||
    target.workspaceId !== state.workspaceId ||
    target.pageKey !== state.pageKey
  const editable =
    !changedTarget && state.ready && (scope === 'global' || state.canEdit)
  const draft = drafts[scope]
  const dirtyScopes = (['global', 'workspace', 'page'] as const).filter(
    key => JSON.stringify(drafts[key]) !== JSON.stringify(baseline[key])
  )
  const dirty = dirtyScopes.length > 0
  const valid = appearanceSchema.safeParse(draft).success
  const effective = resolveAppearance(
    drafts.global,
    scope === 'global' ? {} : drafts.workspace,
    scope === 'page' ? drafts.page : {}
  )
  const disabled = !editable || pending

  useBeforeUnload(event => {
    if (!dirty && !pending) return
    event.preventDefault()
    event.returnValue = ''
  })
  useEffect(() => {
    mounted.current = true
    const previous = document.activeElement as HTMLElement | null
    closeButton.current?.focus()

    return () => {
      mounted.current = false
      previous?.focus()
    }
  }, [])

  function update(changes: Partial<Appearance>) {
    setDrafts(current => {
      const next = { ...current[scope], ...changes }

      for (const key of Object.keys(next) as (keyof Appearance)[])
        if (next[key] === undefined) delete next[key]

      return { ...current, [scope]: next }
    })
    setSaved(false)
  }

  function requestClose() {
    if (pending) return
    if (dirty) setConfirm('close')
    else onClose()
  }

  async function save() {
    if (lock.current || disabled || !valid) return
    lock.current = true
    setPending(true)
    setError('')
    const submitted = appearanceSchema.parse(draft)

    try {
      const revision = await state.save(
        scope,
        submitted,
        scope === 'global' ? revisions.global : revisions.workspace
      )

      if (!mounted.current) return
      setBaseline(current => ({ ...current, [scope]: submitted }))
      setDrafts(current => ({ ...current, [scope]: submitted }))
      setRevisions(current => ({
        ...current,
        [scope === 'global' ? 'global' : 'workspace']: revision
      }))
      setSaved(true)
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      lock.current = false
      if (mounted.current) setPending(false)
    }
  }

  async function reload() {
    if (lock.current) return
    lock.current = true
    setPending(true)
    setError('')

    try {
      await state.reload()
      if (mounted.current) onClose()
    } catch (cause) {
      if (mounted.current) setError(String(cause))
    } finally {
      lock.current = false
      if (mounted.current) setPending(false)
    }
  }

  return (
    <Flex
      ref={dialog}
      aria-labelledby="appearance-builder-title"
      aria-modal={isTop}
      className="workspace-settings appearance-builder"
      data-workspace-overlay="customization"
      role="dialog"
      onKeyDown={event => {
        if (!isTop) return

        if (event.key === 'Escape') {
          event.stopPropagation()
          requestClose()
        }

        if (event.key === 'Tab') {
          const focusable = dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
          )
          const first = focusable?.[0],
            last = focusable?.[focusable.length - 1]

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }
      }}
    >
      <Stack
        as="nav"
        aria-label={t('scope')}
        className="workspace-settings-nav"
        width={undefined}
        gap="xs"
        p="md"
      >
        <Text size="sm" weight="semibold" mb="md">
          {t('title')}
        </Text>
        {(['global', 'workspace', 'page'] as const).map(key => (
          <Button
            key={key}
            aria-current={scope === key ? 'page' : undefined}
            className="workspace-settings-tab"
            disabled={pending}
            icon={
              {
                global: 'lucide:monitor',
                workspace: 'lucide:layers',
                page: 'lucide:file-text'
              }[key]
            }
            justify="start"
            namespace={false}
            variant="plain"
            onClick={() => {
              setScope(key)
              setSaved(false)
              setError('')
            }}
          >
            {t(`scopes.${key}`)}
            {dirtyScopes.includes(key) ? ' •' : ''}
          </Button>
        ))}
        <Text className="workspace-settings-brand" color="muted" size="xs">
          monolith
        </Text>
      </Stack>
      <Stack
        className="workspace-settings-content"
        flex="1"
        minWidth="0"
        gap="lg"
      >
        <Flex align="start" gap="md" justify="between">
          <Stack gap="xs">
            <Text
              as="h2"
              id="appearance-builder-title"
              size="2xl"
              weight="semibold"
            >
              {t(`scopes.${scope}`)}
            </Text>
            <Text color="muted" size="sm">
              {t('description')}
            </Text>
          </Stack>
          <Button
            ref={closeButton}
            aria-label={t('close')}
            disabled={pending}
            icon="lucide:x"
            namespace={false}
            variant="plain"
            onClick={requestClose}
          />
        </Flex>
        <Text color="muted" size="sm">
          {t(`scopeHelp.${scope}`)}
        </Text>
        {!editable && (
          <Text role="alert">
            {t(changedTarget ? 'scopeChanged' : 'readOnly')}
          </Text>
        )}
        <Grid gap="lg" templateCols={{ base: 1, xl: 'minmax(0, 1fr) 230px' }}>
          <Stack
            as="fieldset"
            className="appearance-fields"
            disabled={disabled}
            gap="lg"
          >
            <Stack gap="sm">
              <Text as="h3" weight="semibold">
                {t('palette')}
              </Text>
              <Grid gap="sm" templateCols={{ base: 2, sm: 3 }}>
                {palettes.map(({ id, ...colors }) => (
                  <Button
                    key={id}
                    aria-label={t(`palettes.${id}`)}
                    namespace={false}
                    variant="secondary"
                    onClick={() => update(colors)}
                  >
                    <Box
                      height="14px"
                      r="full"
                      style={{ background: colors.accent }}
                      width="14px"
                    />
                    {t(`palettes.${id}`)}
                  </Button>
                ))}
              </Grid>
              <Grid gap="sm" templateCols={{ base: 1, sm: 2 }}>
                {(['background', 'accent', 'button', 'icons'] as const).map(
                  key => (
                    <ColorInput
                      key={key}
                      disabled={disabled}
                      label={t(`colors.${key}`)}
                      namespace={false}
                      value={draft[key] ?? ''}
                      onChange={value => update({ [key]: value || undefined })}
                    />
                  )
                )}
              </Grid>
            </Stack>
            <Stack gap="sm">
              <Text as="h3" weight="semibold">
                {t('iconStyles')}
              </Text>
              <Field label={t('iconStyle')}>
                <ChoiceSelect
                  label={t('iconStyle')}
                  value={draft.iconSet ?? ''}
                  options={[
                    { value: '', label: t('inherit') },
                    ...iconProviders.map(provider => ({
                      value: provider.id,
                      label: `${provider.name} · ${t(`styles.${provider.style}`)}`
                    }))
                  ]}
                  onChange={value =>
                    update({
                      iconSet: (value || undefined) as Appearance['iconSet']
                    })
                  }
                />
              </Field>
              <Flex gap="sm" wrap="wrap">
                {iconProviders.map(provider => (
                  <Button
                    key={provider.id}
                    aria-label={`${provider.name} ${t(`styles.${provider.style}`)}`}
                    aria-pressed={draft.iconSet === provider.id}
                    icon={provider.sample}
                    iconProps={{ preserveStyle: true }}
                    namespace={false}
                    variant="secondary"
                    onClick={() => update({ iconSet: provider.id })}
                  />
                ))}
              </Flex>
              <Text color="muted" size="xs">
                {t('iconLicense')}
              </Text>
              {scope !== 'global' && (
                <>
                  <IconInput
                    disabled={disabled}
                    label={t(
                      scope === 'workspace' ? 'workspaceIcon' : 'pageIcon'
                    )}
                    namespace={false}
                    value={draft.icon ?? ''}
                    onChange={icon => update({ icon: icon || undefined })}
                  />
                  <Flex gap="xs" wrap="wrap">
                    {[
                      'file-text',
                      'house',
                      'folder',
                      'calendar-days',
                      'database',
                      'sparkles',
                      'layers'
                    ].map(name => {
                      const icon = styledIcon(
                        `lucide:${name}`,
                        draft.iconSet ?? effective.iconSet
                      )

                      return (
                        <Button
                          key={name}
                          aria-label={name}
                          icon={icon}
                          iconProps={{ preserveStyle: true }}
                          namespace={false}
                          variant="secondary"
                          onClick={() => update({ icon })}
                        />
                      )
                    })}
                  </Flex>
                </>
              )}
            </Stack>
            <Stack gap="sm">
              <Text as="h3" weight="semibold">
                {t('typography')}
              </Text>
              <Grid gap="sm" templateCols={{ base: 1, sm: 2 }}>
                <Field label={t('fontProvider')}>
                  <ChoiceSelect
                    label={t('fontProvider')}
                    value={draft.font?.provider ?? ''}
                    options={[
                      { value: '', label: t('inherit') },
                      ...fontProviders.map(provider => ({
                        value: provider,
                        label: t(`fontProviders.${provider}`)
                      }))
                    ]}
                    onChange={value => {
                      const provider = value as
                        NonNullable<Appearance['font']>['provider'] | ''
                      update({
                        font: provider
                          ? {
                              provider,
                              family:
                                provider === 'system' ? 'system-ui' : 'Inter'
                            }
                          : undefined
                      })
                    }}
                  />
                </Field>
                {draft.font && (
                  <Field label={t('fontFamily')}>
                    <ChoiceSelect
                      label={t('fontFamily')}
                      value={draft.font.family}
                      options={fontFamilies
                        .filter(family =>
                          draft.font!.provider === 'system'
                            ? ['system-ui', 'serif', 'monospace'].includes(
                                family
                              )
                            : !['system-ui', 'serif', 'monospace'].includes(
                                family
                              )
                        )
                        .map(family => ({ value: family, label: family }))}
                      onChange={value =>
                        update({
                          font: {
                            ...draft.font!,
                            family: value as NonNullable<
                              Appearance['font']
                            >['family']
                          }
                        })
                      }
                    />
                  </Field>
                )}
              </Grid>
              <Text color="muted" size="xs">
                {t('fontHelp')}
              </Text>
              <Flex gap="md" wrap="wrap">
                {[
                  ['Google Fonts', 'https://fonts.google.com'],
                  ['Bunny Fonts', 'https://fonts.bunny.net'],
                  ['Fontsource', 'https://fontsource.org']
                ].map(([name, href]) => (
                  <Text
                    key={name}
                    as="a"
                    decoration="underline"
                    href={href}
                    rel="noreferrer"
                    size="xs"
                    target="_blank"
                  >
                    {name}
                  </Text>
                ))}
              </Flex>
            </Stack>
            <Stack gap="sm">
              <Text as="h3" weight="semibold">
                {t('cover')}
              </Text>
              <CoverPicker
                value={draft.cover}
                disabled={disabled}
                onChange={cover => update({ cover })}
              />
            </Stack>
            <Grid gap="sm" templateCols={{ base: 1, sm: 2 }}>
              <Field label={t('contentWidth')}>
                <ChoiceSelect
                  label={t('contentWidth')}
                  value={draft.contentWidth ?? ''}
                  options={['', 'standard', 'full'].map(value => ({
                    value,
                    label: t(value || 'inherit')
                  }))}
                  onChange={value =>
                    update({
                      contentWidth: (value ||
                        undefined) as Appearance['contentWidth']
                    })
                  }
                />
              </Field>
              <Field label={t('radius')}>
                <Flex align="center" gap="sm">
                  <Box
                    aria-label={t('radius')}
                    as="input"
                    max="24"
                    min="0"
                    type="range"
                    value={draft.radius ?? 6}
                    onChange={event =>
                      update({ radius: Number(event.target.value) })
                    }
                  />
                  <Text size="sm">
                    {draft.radius === undefined
                      ? t('inherit')
                      : `${draft.radius}px`}
                  </Text>
                </Flex>
              </Field>
            </Grid>
            <Button
              icon="lucide:rotate-ccw"
              namespace={false}
              variant="plain"
              onClick={() => {
                setDrafts(current => ({ ...current, [scope]: {} }))
                setSaved(false)
              }}
            >
              {t('reset')}
            </Button>
          </Stack>
          <Stack className="appearance-preview-column" gap="sm">
            <AppearancePreview
              appearance={
                scope === 'workspace'
                  ? { ...effective, icon: draft.icon }
                  : effective
              }
            />
            <Text color="muted" size="xs">
              {t('inheritHelp')}
            </Text>
          </Stack>
        </Grid>
        {!valid && (
          <Text color="dangerous" role="alert">
            {t('invalid')}
          </Text>
        )}
        {error && (
          <Stack gap="sm">
            <Text color="dangerous" role="alert">
              {error}
            </Text>
            <Button
              disabled={pending}
              namespace={false}
              variant="secondary"
              onClick={() => setConfirm('reload')}
            >
              {t('reload')}
            </Button>
          </Stack>
        )}
        {confirm && (
          <Stack gap="sm" role="alert">
            <Text>
              {t(confirm === 'reload' ? 'reloadConfirm' : 'discardConfirm')}
            </Text>
            <Flex gap="sm" wrap="wrap">
              <Button
                namespace={false}
                variant="secondary"
                onClick={() => setConfirm(null)}
              >
                {t('keepEditing')}
              </Button>
              <Button
                dangerous
                disabled={pending}
                namespace={false}
                onClick={() =>
                  confirm === 'reload' ? void reload() : onClose()
                }
              >
                {t('discard')}
              </Button>
            </Flex>
          </Stack>
        )}
        <Flex
          align="center"
          className="appearance-builder-footer"
          gap="sm"
          justify="between"
          wrap="wrap"
        >
          <Text aria-live="polite" color="muted" role="status" size="sm">
            {pending
              ? t('saving')
              : saved
                ? t('saved')
                : dirty
                  ? t('unsaved')
                  : t('ready')}
          </Text>
          <Button
            disabled={disabled || !valid || !dirtyScopes.includes(scope)}
            icon="lucide:check"
            loading={pending}
            namespace={false}
            onClick={save}
          >
            {t('saveScope', { scope: t(`scopes.${scope}`) })}
          </Button>
        </Flex>
      </Stack>
    </Flex>
  )
}
