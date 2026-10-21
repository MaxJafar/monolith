// SPDX-License-Identifier: 0BSD
import Zoom from 'react-medium-image-zoom'

import { Flex, Icon, Text } from '@/components/primitives'

import { fileSymbol, previewURL } from './model'

export function FilePreview({
  name,
  preview
}: {
  name: string
  preview?: string | null
}) {
  const image = previewURL(preview)
  return (
    <Flex direction="column" gap="sm" minWidth="0">
      {image && (
        <Zoom>
          <img
            key={image}
            alt={name}
            src={image}
            className="monolith-file-preview"
            referrerPolicy="no-referrer"
          />
        </Zoom>
      )}
      <Flex align="center" gap="sm" minWidth="0">
        <Icon icon={fileSymbol(name)} color="muted" />
        <Text truncate size="sm" title={name}>
          {name}
        </Text>
      </Flex>
    </Flex>
  )
}
