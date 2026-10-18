import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Flex,
  ListboxInput,
  ListboxOption,
  NumberInput,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'
import { useState } from 'react'

import { descendants } from '../../design'
import type { Element, Layout } from '../../shared'
import { useEditor } from './EditorProvider'

export function ComponentLibrary() {
  const e = useEditor(),
    { t } = useModuleTranslation()

  const [name, setName] = useState('')

  return (
    <Stack aria-label={t('components.library')} gap="sm">
      <Text size="sm" weight="semibold">
        {t('components.library')}
      </Text>
      {!e.readOnly && (
        <>
          <TextInput
            label="componentName"
            maxLength={160}
            placeholder={t('components.nameHint')}
            value={name}
            onChange={setName}
          />
          <Button
            disabled={!e.selected.length || !name.trim()}
            variant="secondary"
            onClick={() => {
              e.createComponent(name.trim())
              setName('')
            }}
          >
            createComponent
          </Button>
        </>
      )}
      {!e.document.components?.length && (
        <Text color="muted" size="sm">
          {t('components.empty')}
        </Text>
      )}
      {e.document.components?.map(component => (
        <Stack key={component.id} gap="xs">
          <Button
            aria-label={t('components.insert', { name: component.name })}
            disabled={e.readOnly}
            namespace={false}
            variant="secondary"
            onClick={() => e.insertComponent(component.id)}
          >
            {component.name}
          </Button>
          {!e.readOnly && (
            <Button
              dangerous
              aria-label={t('components.remove', { name: component.name })}
              variant="plain"
              onClick={() => e.deleteComponent(component.id)}
            >
              removeComponent
            </Button>
          )}
        </Stack>
      ))}
    </Stack>
  )
}

export function LayoutInspector() {
  const e = useEditor(),
    { t } = useModuleTranslation()
  const selected = e.page.elements.filter(el => e.selected.includes(el.id))
  const element = selected.length === 1 ? selected[0] : undefined
  const patch = (value: Partial<Element>) => {
    if (element) e.changeElements([element.id], value)
  }
  const layout = element?.layout
  const setLayout = (value: Partial<Layout>) => {
    if (layout) patch({ layout: { ...layout, ...value } })
  }
  const instances = [
    ...new Set(
      selected.flatMap(el => (el.component ? [el.component.instance] : []))
    )
  ]
  const disabled = e.readOnly || !!element?.locked
  const select = (
    label: string,
    value: string,
    options: readonly string[],
    onChange: (value: string) => void
  ) => (
    <ListboxInput
      disabled={disabled}
      icon=""
      label={label}
      renderContent={() => <Text size="sm">{t(`layout.${value}`)}</Text>}
      value={value}
      onChange={onChange}
    >
      {options.map(option => (
        <ListboxOption
          key={option}
          label={t(`layout.${option}`)}
          value={option}
        />
      ))}
    </ListboxInput>
  )

  if (!selected.length) return null

  return (
    <Stack gap="sm">
      {instances.length === 1 && (
        <Stack aria-label={t('components.instance')} gap="xs">
          <Text size="sm" weight="semibold">
            {t('components.instance')}
          </Text>
          <Text color="muted" size="sm">
            {t('components.overrideHint')}
          </Text>
          <Button
            disabled={disabled}
            variant="secondary"
            onClick={() => e.updateComponent(instances[0]!)}
          >
            updateComponent
          </Button>
          <Button
            disabled={disabled}
            variant="plain"
            onClick={() => e.resetComponent(instances[0]!)}
          >
            resetComponent
          </Button>
          <Button
            disabled={disabled}
            variant="plain"
            onClick={() => e.detachComponent(instances[0]!)}
          >
            detachComponent
          </Button>
        </Stack>
      )}
      <Text size="sm" weight="semibold">
        {t('layout.title')}
      </Text>
      <Button disabled={disabled} variant="secondary" onClick={e.createLayout}>
        wrapLayout
      </Button>
      {element && (
        <>
          <ListboxInput
            disabled={disabled}
            icon=""
            label="parentFrame"
            renderContent={() => (
              <Text size="sm">
                {e.page.elements.find(p => p.id === element.parent)?.name ??
                  t('layout.none')}
              </Text>
            )}
            value={element.parent ?? ''}
            onChange={parent => patch({ parent: parent || null })}
          >
            <ListboxOption label={t('layout.none')} value="" />
            {e.page.elements
              .filter(
                frame =>
                  frame.kind === 'frame' &&
                  !descendants(e.page, [element.id]).has(frame.id)
              )
              .map(frame => (
                <ListboxOption
                  key={frame.id}
                  label={frame.name}
                  value={frame.id}
                />
              ))}
          </ListboxInput>
          {select(
            'widthMode',
            element.widthMode ?? 'fixed',
            element.kind === 'frame'
              ? ['fixed', 'hug', 'fill']
              : ['fixed', 'fill'],
            widthMode => patch({ widthMode: widthMode as Element['widthMode'] })
          )}
          {select(
            'heightMode',
            element.heightMode ?? 'fixed',
            element.kind === 'frame'
              ? ['fixed', 'hug', 'fill']
              : ['fixed', 'fill'],
            heightMode =>
              patch({ heightMode: heightMode as Element['heightMode'] })
          )}
          {element.kind === 'frame' &&
            (!layout ? (
              <Button
                disabled={disabled}
                variant="secondary"
                onClick={() => e.enableLayout(element.id)}
              >
                enableLayout
              </Button>
            ) : (
              <>
                {select(
                  'layoutDirection',
                  layout.direction,
                  ['horizontal', 'vertical'],
                  direction =>
                    setLayout({ direction: direction as Layout['direction'] })
                )}
                {select(
                  'layoutAlign',
                  layout.align,
                  ['start', 'center', 'end', 'stretch'],
                  align => setLayout({ align: align as Layout['align'] })
                )}
                {select(
                  'layoutJustify',
                  layout.justify,
                  ['start', 'center', 'end', 'space-between'],
                  justify =>
                    setLayout({ justify: justify as Layout['justify'] })
                )}
                <NumberInput
                  disabled={disabled}
                  icon=""
                  label="layoutGap"
                  max={2000}
                  min={0}
                  value={layout.gap}
                  onChange={gap => {
                    if (Number.isFinite(gap))
                      setLayout({ gap: Math.max(0, Math.min(2000, gap)) })
                  }}
                />
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                  <NumberInput
                    key={side}
                    disabled={disabled}
                    icon=""
                    label={`padding${side[0]!.toUpperCase()}${side.slice(1)}`}
                    max={2000}
                    min={0}
                    value={layout.padding[side]}
                    onChange={value => {
                      if (Number.isFinite(value))
                        setLayout({
                          padding: {
                            ...layout.padding,
                            [side]: Math.max(0, Math.min(2000, value))
                          }
                        })
                    }}
                  />
                ))}
                <Button
                  aria-pressed={layout.wrap}
                  disabled={disabled}
                  variant={layout.wrap ? 'secondary' : 'plain'}
                  onClick={() => setLayout({ wrap: !layout.wrap })}
                >
                  toggleWrap
                </Button>
                <Button
                  disabled={disabled}
                  variant="plain"
                  onClick={() => patch({ layout: undefined })}
                >
                  removeLayout
                </Button>
              </>
            ))}
        </>
      )}
    </Stack>
  )
}

export function PresenceBar() {
  const e = useEditor(),
    { t } = useModuleTranslation()

  const [copied, setCopied] = useState(false)

  return (
    <Flex
      align="center"
      aria-label={t('collaboration.people')}
      gap="xs"
      wrap="wrap"
    >
      <Text
        color={e.connection === 'offline' ? 'dangerous' : 'muted'}
        size="sm"
      >
        {t(`collaboration.${e.connection}`)}
      </Text>
      {e.peers.map(peer => (
        <Text
          key={`${peer.user}:${peer.session}`}
          size="sm"
          style={{ color: peer.color }}
          title={t(`collaboration.${peer.role}`)}
        >
          {peer.name}
        </Text>
      ))}
      <Button
        namespace={false}
        title={t('collaboration.shareHint')}
        variant="plain"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(location.href)
            setCopied(true)
          } catch {
            e.setError('copyFailed')
          }
        }}
      >
        {t(copied ? 'collaboration.copied' : 'collaboration.share')}
      </Button>
    </Flex>
  )
}
