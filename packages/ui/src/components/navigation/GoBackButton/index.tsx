// SPDX-License-Identifier: 0BSD
import { Button } from '@/components/inputs/Button'

export function GoBackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="plain"
      icon="tabler:arrow-left"
      namespace="common.buttons"
      width="fit-content"
      onClick={onClick}
    >
      goBack
    </Button>
  )
}
