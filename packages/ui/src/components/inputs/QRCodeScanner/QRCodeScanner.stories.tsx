// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { useModalStore } from '@/providers'

import { Button } from '../Button'
import { QRCodeScanner } from './index'

const meta = {
  component: QRCodeScanner,
  title: 'Inputs/QRCodeScanner',
  args: { data: { onScanned: () => {} }, onClose: () => {} }
} satisfies Meta<typeof QRCodeScanner>
export default meta
type Story = StoryObj<typeof meta>
function ScanExample() {
  const [value, setValue] = useState('')
  const { open } = useModalStore()
  return (
    <>
      <Button
        namespace={false}
        icon="tabler:qrcode"
        onClick={() =>
          open(QRCodeScanner, { formats: ['qr_code'], onScanned: setValue })
        }
      >
        Scan a QR code
      </Button>
      <output>{value}</output>
    </>
  )
}
export const Camera: Story = { render: () => <ScanExample /> }
