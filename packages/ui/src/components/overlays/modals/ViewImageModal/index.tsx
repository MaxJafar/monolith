// SPDX-License-Identifier: 0BSD
import { Stack } from '@/components/primitives'

import { ModalHeader } from '../ModalHeader'

export function ViewImageModal({
  data,
  onClose
}: {
  data: { src: string; alt?: string }
  onClose: () => void
}) {
  return (
    <Stack gap="md" maxWidth="100%">
      <ModalHeader
        namespace="common.modals"
        title="viewImage"
        icon="tabler:photo"
        onClose={onClose}
      />
      {data.src && (
        <figure style={{ margin: 0, display: 'grid', placeItems: 'center' }}>
          <img
            src={data.src}
            alt={data.alt ?? ''}
            decoding="async"
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '75dvh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)'
            }}
          />
        </figure>
      )}
    </Stack>
  )
}
