import { useMemo } from 'react'

import { useFederation } from '@lifeforge/federation'
import { Text, usePersonalization } from '@lifeforge/ui'

function MainSidebarTitle({ title }: { title: string }) {
  const { categoryTranslations } = useFederation()
  const { language } = usePersonalization()

  const translatedTitle = useMemo(() => {
    const key = title.toLowerCase()

    const translations = categoryTranslations[key]

    if (translations && translations[language]) {
      return translations[language]
    }

    return title
  }, [title, categoryTranslations, language])

  return (
    <Text
      as="h3"
      color="muted"
      pb="xs"
      pt="md"
      px="lg"
      size="sm"
      weight="medium"
    >
      {translatedTitle}
    </Text>
  )
}

export default MainSidebarTitle
