import { type ComponentProps } from 'react'

import { Text } from '@lifeforge/ui'

import numberToCurrency from '@/utils/numberToCurrency'

function TransactionAmount({
  amount,
  color,
  sign
}: {
  amount: number
  color: ComponentProps<typeof Text>['color']
  sign: string
}) {
  return (
    <Text color={color} size="lg" weight="medium">
      {sign}
      {numberToCurrency(amount)}
    </Text>
  )
}

export default TransactionAmount
