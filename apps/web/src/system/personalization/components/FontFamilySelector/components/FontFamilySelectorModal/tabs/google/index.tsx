import { useQuery } from '@tanstack/react-query'

import type { InferOutput } from '@monolith/api'
import { EmptyStateScreen, Flex, WithQuery } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import GoogleFontFilter from './components/GoogleFontFilter'
import GoogleFontList from './components/GoogleFontList'
import { GoogleFontProvider, useGoogleFont } from './contexts/GoogleFontContext'

export type FontFamily = InferOutput<
  typeof workspaceAPI.fonts.google.list
>['items'][number]

function GoogleFontSelectorContent() {
  const apiKeyAvailable = useQuery(
    workspaceAPI
      .checkAPIKeys({
        keys: 'gcloud'
      })
      .queryOptions()
  )

  const { pinnedFontsQuery, fontsQuery } = useGoogleFont()

  return (
    <WithQuery query={apiKeyAvailable}>
      {apiKeyAvailable =>
        apiKeyAvailable ? (
          <WithQuery query={pinnedFontsQuery}>
            {pinnedFontsData => (
              <WithQuery query={fontsQuery}>
                {fonts => (
                  <>
                    <GoogleFontFilter />
                    <GoogleFontList
                      fontsEnabled={fonts.enabled}
                      pinnedFonts={pinnedFontsData}
                    />
                  </>
                )}
              </WithQuery>
            )}
          </WithQuery>
        ) : (
          <Flex centered flex="1">
            <EmptyStateScreen
              icon="tabler:key-off"
              message={{
                id: 'apiKey',
                namespace: 'common.personalization',
                tKey: 'fontFamily'
              }}
            />
          </Flex>
        )
      }
    </WithQuery>
  )
}

function GoogleFontSelector() {
  return (
    <GoogleFontProvider>
      <GoogleFontSelectorContent />
    </GoogleFontProvider>
  )
}

export default GoogleFontSelector
