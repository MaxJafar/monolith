import { DIFFICULTIES } from '@'
import { useQuery } from '@tanstack/react-query'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  SidebarItem,
  SidebarTitle,
  WithQuery,
  usePersonalization
} from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'
import { forgeAPI } from '@/manifest'

function DifficultiesSection() {
  const { t } = useModuleTranslation()
  const { bgTempPalette } = usePersonalization()
  const { updateFilter, filter } = useFilter()

  const difficultiesCountQuery = useQuery(
    forgeAPI.entries.difficultiesCount.queryOptions()
  )

  return (
    <>
      <SidebarTitle label="difficulties" />
      <SidebarItem
        active={!filter.difficulty}
        icon="tabler:circle-dot-filled"
        label="All Difficulties"
        sideStripColor={bgTempPalette[500]}
        onClick={() => {
          updateFilter('difficulty', null)
        }}
      />
      <WithQuery query={difficultiesCountQuery}>
        {difficultiesCount => (
          <>
            {Object.entries(DIFFICULTIES).map(([difficulty, color]) => (
              <SidebarItem
                key={difficulty}
                active={filter.difficulty === difficulty}
                icon="tabler:circle-dot"
                label={t(`difficulties.${difficulty}`)}
                namespace={false}
                number={difficultiesCount[difficulty] || 0}
                sideStripColor={color}
                onCancelButtonClick={() => {
                  updateFilter('difficulty', null)
                }}
                onClick={() => {
                  updateFilter('difficulty', difficulty)
                }}
              />
            ))}
          </>
        )}
      </WithQuery>
    </>
  )
}

export default DifficultiesSection
