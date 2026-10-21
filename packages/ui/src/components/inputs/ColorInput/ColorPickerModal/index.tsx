// SPDX-License-Identifier: 0BSD
import { Colorful } from '@uiw/react-color'
import { useId, useState } from 'react'

import { Button } from '@/components/inputs/Button'
import { NumberInput } from '@/components/inputs/NumberInput'
import { TextInput } from '@/components/inputs/TextInput'
import { ModalHeader } from '@/components/overlays'
import { Box, Flex, Stack } from '@/components/primitives'

import {
  type HSV,
  type RGB,
  colorSwatches,
  hexToRgb,
  hsvToHex,
  parseHex,
  rgbToHex,
  rgbToHsv
} from '../color'

export function ColorPickerModal({
  data,
  onClose
}: {
  data: { value: string; onChange: (color: string) => void }
  onClose: () => void
}) {
  const titleId = useId()
  const [hex, setHex] = useState(() => parseHex(data.value) ?? '#000000')
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(hex)))
  const canonical = parseHex(hex)
  const rgb = hexToRgb(canonical ?? hsvToHex(hsv))
  function selectHex(value: string) {
    setHex(value)
    const parsed = parseHex(value)
    if (parsed) setHsv(rgbToHsv(hexToRgb(parsed)))
  }
  function selectHsv(value: HSV) {
    const next = {
      h: Math.max(0, Math.min(360, value.h)),
      s: Math.max(0, Math.min(100, value.s)),
      v: Math.max(0, Math.min(100, value.v))
    }
    setHsv(next)
    setHex(hsvToHex(next))
  }
  function confirm() {
    if (!canonical) return
    data.onChange(canonical)
    onClose()
  }
  return (
    <Stack
      role="dialog"
      aria-labelledby={titleId}
      className="monolith-form-dialog monolith-color-editor"
      width="360px"
      maxWidth="100%"
      gap="md"
    >
      <ModalHeader
        titleId={titleId}
        icon="tabler:palette"
        title="colorPicker.title"
        onClose={onClose}
      />
      <Colorful
        disableAlpha
        color={{ ...hsv, a: 1 }}
        onChange={result => selectHsv(result.hsva)}
      />
      <TextInput
        label="HEX"
        namespace={false}
        value={hex}
        placeholder="#6993C3"
        onChange={selectHex}
        onEnter={confirm}
        aria-invalid={!canonical}
      />
      <Flex gap="sm" role="group" aria-label="RGB">
        {(['r', 'g', 'b'] as const).map(channel => (
          <Box key={channel} flex="1" minWidth="0">
            <NumberInput
              namespace={false}
              label={channel.toUpperCase()}
              icon=""
              min={0}
              max={255}
              value={rgb[channel]}
              onChange={value =>
                selectHex(rgbToHex({ ...rgb, [channel]: value } as RGB))
              }
            />
          </Box>
        ))}
      </Flex>
      <Flex gap="sm" role="group" aria-label="HSV">
        {(['h', 's', 'v'] as const).map(channel => (
          <Box key={channel} flex="1" minWidth="0">
            <NumberInput
              namespace={false}
              label={channel.toUpperCase()}
              icon=""
              min={0}
              max={channel === 'h' ? 360 : 100}
              value={Math.round(hsv[channel] * 100) / 100}
              onChange={value => selectHsv({ ...hsv, [channel]: value })}
            />
          </Box>
        ))}
      </Flex>
      <div className="monolith-color-swatches">
        {colorSwatches.map(color => (
          <button
            type="button"
            key={color}
            aria-label={color}
            aria-pressed={canonical === color}
            title={color}
            style={{ backgroundColor: color }}
            onClick={() => selectHex(color)}
          />
        ))}
      </div>
      <Flex gap="sm" justify="end">
        <Button variant="plain" onClick={onClose}>
          cancel
        </Button>
        <Button disabled={!canonical} icon="tabler:check" onClick={confirm}>
          select
        </Button>
      </Flex>
    </Stack>
  )
}
