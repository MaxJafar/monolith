import { useModuleTranslation } from '@monolith/localization'
import { Text } from '@monolith/ui'

export default function HoursAndMinutesFromSeconds({
  seconds
}: {
  seconds: number
}) {
  const { t } = useModuleTranslation()

  return (
    <>
      {seconds === 0 ? (
        <Text color="muted" mr="md" size="xl">
          {t('units.noTime')}
        </Text>
      ) : (
        <>
          {Math.floor(seconds / 3600) > 0 ? (
            <>
              {Math.floor(seconds / 3600).toLocaleString()}
              <Text as="span" color="muted" pl="xs" size="3xl">
                {t('units.h')}
              </Text>
            </>
          ) : (
            ''
          )}{' '}
          {Math.floor(seconds / 60) % 60 > 0 ? (
            <>
              {Math.floor(seconds / 60) % 60}
              <Text as="span" color="muted" pl="xs" size="3xl">
                {t('units.m')}
              </Text>
            </>
          ) : (
            ''
          )}
        </>
      )}
    </>
  )
}
