import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ColorInput,
  Flex,
  Grid,
  NumberInput,
  Stack,
  Text,
  TextAreaInput,
  TextInput,
  surface
} from '@monolith/ui'

import type { Element } from '../../shared'
import { LayoutInspector } from './DesignPanels'
import { useEditor } from './EditorProvider'
import { FileTags } from './FileTags'
import { PrototypeInspector } from './Prototype'
import { VectorInspector } from './VectorEditor'
import { clamp, palette } from './model'

export function Inspector() {
  const e = useEditor(),
    { t } = useModuleTranslation()

  const objects = e.page.elements.filter(el => e.selected.includes(el.id))
  const element = objects.length === 1 ? objects[0] : undefined
  const edge = e.page.connectors.find(edge => e.selected.includes(edge.id))
  const disabled = e.readOnly || element?.locked
  const change = (patch: Partial<Element>) =>
    e.changeElements(e.selected, patch)

  return (
    <Stack
      aria-label={t('editor.properties')}
      as="aside"
      bg={surface.default}
      gap="md"
      height="100%"
      overflowY="auto"
      p="md"
    >
      <Text size="sm" weight="semibold">
        {t('editor.properties')}
      </Text>
      {element ? (
        <>
          <TextInput
            disabled={disabled}
            label="name"
            maxLength={160}
            placeholder={t('inputs.name.placeholder')}
            value={element.name}
            onChange={name => change({ name })}
          />
          <Grid gap="sm" templateCols={2}>
            {(
              [
                { key: 'x', min: -100000, max: 100000 },
                { key: 'y', min: -100000, max: 100000 },
                { key: 'width', min: 1, max: 20000 },
                { key: 'height', min: 1, max: 20000 },
                { key: 'rotation', min: -360, max: 360 },
                { key: 'radius', min: 0, max: 1000 }
              ] as const
            ).map(field => (
              <NumberInput
                key={field.key}
                disabled={disabled}
                icon=""
                label={field.key}
                max={field.max}
                min={field.min}
                value={Math.round(element[field.key] * 100) / 100}
                onChange={value => {
                  if (Number.isFinite(value))
                    change({ [field.key]: clamp(value, field.min, field.max) })
                }}
              />
            ))}
          </Grid>
          <ColorInput
            disabled={disabled}
            label="fill"
            value={element.fill}
            onChange={fill => {
              if (/^#[\da-f]{6}$/i.test(fill))
                change({ fill, gradient: undefined })
            }}
          />
          <Flex aria-label={t('editor.palette')} gap="xs" wrap="wrap">
            {palette.map(color => (
              <Box
                key={color}
                aria-label={color}
                as="button"
                className="redraw-swatch"
                disabled={disabled}
                height="1.75rem"
                r="full"
                style={{ backgroundColor: color }}
                type="button"
                width="1.75rem"
                onClick={() => change({ fill: color, gradient: undefined })}
              />
            ))}
          </Flex>
          <ColorInput
            disabled={disabled}
            label="stroke"
            value={element.stroke}
            onChange={stroke => {
              if (/^#[\da-f]{6}$/i.test(stroke)) change({ stroke })
            }}
          />
          <Grid gap="sm" templateCols={2}>
            <NumberInput
              disabled={disabled}
              icon=""
              label="strokeWidth"
              max={40}
              min={0}
              value={element.strokeWidth}
              onChange={value => change({ strokeWidth: clamp(value, 0, 40) })}
            />
            <NumberInput
              disabled={disabled}
              icon=""
              label="opacity"
              max={100}
              min={0}
              value={Math.round(element.opacity * 100)}
              onChange={value => change({ opacity: clamp(value / 100, 0, 1) })}
            />
          </Grid>
          {element.kind !== 'image' && element.kind !== 'path' && (
            <>
              <Box data-redraw-text>
                <TextAreaInput
                  disabled={disabled}
                  label="text"
                  placeholder={t('inputs.text.placeholder')}
                  value={element.text}
                  onChange={text => change({ text: text.slice(0, 10000) })}
                />
              </Box>
              <NumberInput
                disabled={disabled}
                icon="lucide:type"
                label="fontSize"
                max={400}
                min={8}
                value={element.fontSize}
                onChange={value => change({ fontSize: clamp(value, 8, 400) })}
              />
              <ColorInput
                disabled={disabled}
                label="textColor"
                value={element.textColor}
                onChange={textColor => {
                  if (/^#[\da-f]{6}$/i.test(textColor))
                    change({
                      textColor,
                      ...(element.kind === 'text'
                        ? { gradient: undefined }
                        : {})
                    })
                }}
              />
              <Flex gap="xs">
                <Button
                  aria-label={t('editor.bold')}
                  aria-pressed={element.fontWeight === '700'}
                  disabled={disabled}
                  icon="lucide:bold"
                  variant={element.fontWeight === '700' ? 'secondary' : 'plain'}
                  onClick={() =>
                    change({
                      fontWeight: element.fontWeight === '700' ? '400' : '700'
                    })
                  }
                />
                {(['left', 'center', 'right'] as const).map(align => (
                  <Button
                    key={align}
                    aria-label={t(`editor.align${align}`)}
                    aria-pressed={element.align === align}
                    disabled={disabled}
                    icon={
                      {
                        left: 'lucide:align-left',
                        center: 'lucide:align-center',
                        right: 'lucide:align-right'
                      }[align]
                    }
                    variant={element.align === align ? 'secondary' : 'plain'}
                    onClick={() => change({ align })}
                  />
                ))}
              </Flex>
            </>
          )}
          {e.page.mode === 'blackboard' && (
            <Button
              disabled={disabled}
              icon="lucide:git-branch"
              onClick={() => e.addBranch(t('samples.newIdea'))}
            >
              addBranch
            </Button>
          )}
        </>
      ) : edge ? (
        <>
          <TextInput
            disabled={e.readOnly}
            label="connectionLabel"
            maxLength={200}
            placeholder={t('inputs.connectionLabel.placeholder')}
            value={edge.label}
            onChange={label =>
              e.updatePage({
                ...e.page,
                connectors: e.page.connectors.map(c =>
                  c.id === edge.id ? { ...c, label } : c
                )
              })
            }
          />
          <ColorInput
            disabled={e.readOnly}
            label="stroke"
            value={edge.color}
            onChange={color => {
              if (/^#[\da-f]{6}$/i.test(color))
                e.updatePage({
                  ...e.page,
                  connectors: e.page.connectors.map(c =>
                    c.id === edge.id ? { ...c, color } : c
                  )
                })
            }}
          />
          <Button
            aria-pressed={edge.style === 'curve'}
            disabled={e.readOnly}
            variant="secondary"
            onClick={() =>
              e.updatePage({
                ...e.page,
                connectors: e.page.connectors.map(c =>
                  c.id === edge.id
                    ? {
                        ...c,
                        style: c.style === 'curve' ? 'straight' : 'curve'
                      }
                    : c
                )
              })
            }
          >
            toggleCurve
          </Button>
          <Button
            aria-pressed={edge.arrow}
            disabled={e.readOnly}
            variant="secondary"
            onClick={() =>
              e.updatePage({
                ...e.page,
                connectors: e.page.connectors.map(c =>
                  c.id === edge.id ? { ...c, arrow: !c.arrow } : c
                )
              })
            }
          >
            toggleArrow
          </Button>
        </>
      ) : objects.length > 1 ? (
        <>
          <Text size="sm">
            {t('editor.selected', { count: objects.length })}
          </Text>
          <Grid gap="xs" templateCols={3}>
            {(
              ['left', 'center', 'right', 'top', 'middle', 'bottom'] as const
            ).map(axis => (
              <Button
                key={axis}
                disabled={e.readOnly}
                namespace={false}
                variant="secondary"
                onClick={() => e.align(axis)}
              >
                <Text size="sm">{t(`align.${axis}`)}</Text>
              </Button>
            ))}
          </Grid>
          <Button
            disabled={e.readOnly}
            icon="lucide:group"
            variant="secondary"
            onClick={() => e.group()}
          >
            group
          </Button>
          <Button
            disabled={e.readOnly}
            variant="plain"
            onClick={() => e.group(true)}
          >
            ungroup
          </Button>
        </>
      ) : (
        <>
          <Text color="muted" size="sm">
            {t('editor.selectHint')}
          </Text>
          <TextInput
            disabled={e.readOnly}
            label="pageName"
            maxLength={160}
            placeholder={t('inputs.pageName.placeholder')}
            value={e.page.name}
            onChange={name => {
              if (name.trim()) e.updatePage({ ...e.page, name })
            }}
          />
          <ColorInput
            disabled={e.readOnly}
            label="background"
            value={e.page.background}
            onChange={background => {
              if (/^#[\da-f]{6}$/i.test(background))
                e.updatePage({ ...e.page, background })
            }}
          />
          {e.document.pages.length > 1 && (
            <Button
              dangerous
              disabled={e.readOnly}
              icon="lucide:trash-2"
              variant="plain"
              onClick={() =>
                e.replace({
                  ...e.document,
                  pages: e.document.pages.filter(page => page.id !== e.pageId)
                })
              }
            >
              deletePage
            </Button>
          )}
        </>
      )}
      <LayoutInspector />
      <VectorInspector />
      <PrototypeInspector />
      {!e.selected.length && <FileTags />}
      {!!e.selected.length && (
        <Stack gap="sm">
          {!!objects.length && (
            <>
              <Flex gap="xs">
                <Button
                  disabled={disabled}
                  icon="lucide:copy"
                  variant="secondary"
                  onClick={e.duplicate}
                >
                  duplicate
                </Button>
                <Button
                  disabled={e.readOnly}
                  icon="lucide:lock"
                  variant="plain"
                  onClick={() =>
                    e.changeElements(
                      e.selected,
                      { locked: !objects.every(el => el.locked) },
                      true
                    )
                  }
                >
                  {objects.every(el => el.locked) ? 'unlock' : 'lock'}
                </Button>
              </Flex>
              <Flex gap="xs">
                <Button
                  disabled={disabled}
                  variant="plain"
                  onClick={() => e.reorder(true)}
                >
                  bringFront
                </Button>
                <Button
                  disabled={disabled}
                  variant="plain"
                  onClick={() => e.reorder(false)}
                >
                  sendBack
                </Button>
              </Flex>
            </>
          )}
          <Button
            dangerous
            disabled={disabled}
            icon="lucide:trash-2"
            variant="plain"
            onClick={e.remove}
          >
            deleteSelection
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
