import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Box, Flex, Grid, Icon, Text } from '@/components/primitives'

import { Button } from '../Button'
import './colorPicker.css'

const colors = [
  ['gray', '#939390'],
  ['brown', '#cb7351'],
  ['orange', '#df9c45'],
  ['yellow', '#d5b64b'],
  ['green', '#4caa78'],
  ['blue', '#438ce1'],
  ['purple', '#a17bd8'],
  ['pink', '#d06ea4'],
  ['red', '#de6262']
] as const

/** A compact color menu; undefined follows the surrounding customization color. */
export function ColorPicker({
  label,
  value,
  onChange,
  disabled,
  compact = false
}: {
  label: string
  value?: string
  onChange: (color: string | undefined) => void
  disabled?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation('common.workspaceUI')
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [hex, setHex] = useState(value ?? '')
  const choose = (color: string | undefined) => {
    onChange(color)
    setAnchor(null)
  }
  const named = colors.find(([, color]) => color === value)
  return (
    <>
      <Button
        namespace={false}
        variant="plain"
        className="monolith-color-trigger"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={e => {
          setHex(value ?? '')
          setAnchor(e.currentTarget)
        }}
      >
        <Box
          className="monolith-color-preview"
          style={{ backgroundColor: value || 'var(--selection-color)' }}
        />
        {!compact && (
          <Text size="sm" color="muted">
            {named ? t(`palette.${named[0]}`) : value || t('palette.default')}
          </Text>
        )}
      </Button>
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={label}
          width={236}
          onClose={() => setAnchor(null)}
        >
          <Button
            namespace={false}
            variant="plain"
            justify="start"
            width="100%"
            onClick={() => choose(undefined)}
          >
            <Icon icon="lucide:rotate-ccw" size="14px" />
            <Text size="sm">{t('palette.default')}</Text>
            {!value && <Icon icon="lucide:check" size="14px" />}
          </Button>
          <Grid
            templateCols={9}
            gap="xs"
            className="monolith-color-grid"
            role="group"
            aria-label={label}
          >
            {colors.map(([name, color]) => (
              <button
                key={color}
                type="button"
                aria-label={t(`palette.${name}`)}
                aria-pressed={value === color}
                title={t(`palette.${name}`)}
                style={{ backgroundColor: color }}
                onClick={() => choose(color)}
              >
                {value === color && <Icon icon="lucide:check" size="13px" />}
              </button>
            ))}
          </Grid>
          <Flex align="center" gap="sm" className="monolith-custom-color-row">
            <input
              type="color"
              aria-label={t('customColor')}
              value={/^#[a-f\d]{6}$/i.test(hex) ? hex : '#438ce1'}
              onChange={e => {
                setHex(e.target.value)
                onChange(e.target.value)
              }}
            />
            <input
              type="text"
              aria-label={t('customColor') + ' HEX'}
              placeholder="#438ce1"
              maxLength={7}
              value={hex}
              onChange={e => setHex(e.target.value)}
              onBlur={() => {
                if (/^#[a-f\d]{6}$/i.test(hex)) onChange(hex)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && /^#[a-f\d]{6}$/i.test(hex)) {
                  e.preventDefault()
                  choose(hex)
                }
              }}
            />
          </Flex>
        </FloatingPopover>
      )}
    </>
  )
}
