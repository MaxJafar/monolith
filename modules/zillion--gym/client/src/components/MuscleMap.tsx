import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Grid, HorizontalBarChart } from '@lifeforge/ui'

import type { GymStats, MuscleGroup } from '../../../shared'

const regions: { group: MuscleGroup; path: string }[] = [
  {
    group: 'chest',
    path: 'M74 63L98 70V98L75 92ZM102 70L126 63L125 92L102 98Z'
  },
  {
    group: 'shoulders',
    path: 'M72 62L61 69L56 88L70 85ZM128 62L139 69L144 88L130 85Z'
  },
  {
    group: 'biceps',
    path: 'M56 91L69 88L64 116L51 113ZM144 91L131 88L136 116L149 113Z'
  },
  {
    group: 'forearms',
    path: 'M50 116L63 119L55 155L42 153ZM150 116L137 119L145 155L158 153Z'
  },
  { group: 'core', path: 'M78 98L98 103L122 98L120 142L80 142Z' },
  {
    group: 'quadriceps',
    path: 'M80 147L98 150L96 202L75 202ZM102 150L120 147L125 202L104 202Z'
  },
  {
    group: 'calves',
    path: 'M75 208L94 209L90 250L76 250ZM106 209L125 208L124 250L110 250Z'
  },
  { group: 'back', path: 'M274 64L299 73L326 64L323 113L277 113Z' },
  {
    group: 'triceps',
    path: 'M257 90L270 87L265 116L252 113ZM343 90L330 87L335 116L348 113Z'
  },
  {
    group: 'glutes',
    path: 'M278 118L298 117V150L276 148ZM302 117L322 118L324 148L302 150Z'
  },
  {
    group: 'hamstrings',
    path: 'M276 154L297 157L295 202L275 202ZM303 157L324 154L325 202L305 202Z'
  }
]

export function MuscleMap({
  values,
  bodyStyle
}: {
  values: GymStats['muscles']
  bodyStyle: 'male' | 'female'
}) {
  const { t } = useModuleTranslation()

  const max = Math.max(1, ...values.map(value => value.sets))

  return (
    <Grid align="center" gap="lg" templateCols={{ base: 1, md: 2 }}>
      <Box color="primary" maxWidth="30rem" width="100%">
        <svg
          aria-label={t('stats.muscleMap')}
          role="img"
          viewBox="0 0 400 275"
          width="100%"
        >
          <g fill="currentColor" opacity="0.15">
            <circle cx="100" cy="34" r="19" />
            <circle cx="300" cy="34" r="19" />
            <path
              d={
                bodyStyle === 'female'
                  ? 'M76 58H124L146 85L165 155L142 162L120 110L130 153L127 208L124 266H108L100 203L92 266H76L73 208L70 153L80 110L58 162L35 155L54 85ZM276 58H324L346 85L365 155L342 162L320 110L330 153L327 208L324 266H308L300 203L292 266H276L273 208L270 153L280 110L258 162L235 155L254 85Z'
                  : 'M73 58H127L150 85L165 155L142 162L127 118L132 208L129 266H108L100 203L92 266H71L68 208L73 118L58 162L35 155L50 85ZM273 58H327L350 85L365 155L342 162L327 118L332 208L329 266H308L300 203L292 266H271L268 208L273 118L258 162L235 155L250 85Z'
              }
            />
          </g>
          {regions.map(region => (
            <path
              key={region.group}
              d={region.path}
              fill="currentColor"
              opacity={
                0.15 +
                ((values.find(value => value.muscle_group === region.group)
                  ?.sets ?? 0) /
                  max) *
                  0.85
              }
            >
              <title>
                {t(`muscles.${region.group}`)}:{' '}
                {values.find(value => value.muscle_group === region.group)
                  ?.sets ?? 0}
              </title>
            </path>
          ))}
        </svg>
      </Box>
      <HorizontalBarChart
        emptyLabel={t('stats.noPeriodWorkouts')}
        label={t('stats.muscleMap')}
        points={values
          .slice()
          .sort((a, b) => b.sets - a.sets)
          .map(value => ({
            label: t(`muscles.${value.muscle_group}`),
            value: value.sets,
            detail: t('stats.muscleSets', {
              count: value.sets,
              hard: value.hard_sets
            })
          }))}
      />
    </Grid>
  )
}
