import { useTranslation } from 'react-i18next'

import { Flex, LoadingScreen } from '@lifeforge/ui'

export default function RouteLoadingScreen({ message }: { message: string }) {
  const { t } = useTranslation('common.misc')

  return (
    <Flex aria-live="polite" direction="column" flex="1" role="status">
      <LoadingScreen message={t(message, { defaultValue: message })} />
    </Flex>
  )
}
