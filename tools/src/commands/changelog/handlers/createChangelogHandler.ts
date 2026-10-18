import { log } from '@clack/prompts'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

dayjs.extend(weekOfYear)
export default function createChangelogHandler(year?: string, week?: string) {
  const date = dayjs()
  const selectedYear = year === undefined ? date.year() : Number(year)
  const selectedWeek = week === undefined ? date.week() : Number(week)
  if (
    !Number.isInteger(selectedYear) ||
    selectedYear < 2000 ||
    selectedYear > 9999 ||
    !Number.isInteger(selectedWeek) ||
    selectedWeek < 1 ||
    selectedWeek > 53
  )
    throw new Error('Use a four-digit year and a week between 1 and 53')
  const directory = join(ROOT_DIR, 'docs', 'changelog', String(selectedYear))
  mkdirSync(directory, { recursive: true })
  const destination = join(
    directory,
    String(selectedWeek).padStart(2, '0') + '.md'
  )
  const content =
    '# Monolith release notes\n\n## Added\n\n## Changed\n\n## Fixed\n\n## Upgrade notes\n'
  writeFileSync(destination, content, { flag: 'wx' })
  log.success('Created ' + destination)
}
