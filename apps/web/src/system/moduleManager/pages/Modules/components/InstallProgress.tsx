import { useTranslation } from 'react-i18next'

import type { AddonJob } from '@monolith/configs'
import { Box, Stack, Text } from '@monolith/ui'

export default function InstallProgress({ job }: { job: AddonJob }) {
  const { t } = useTranslation('common.module-manager')
  const progress = job.total
    ? Math.min(100, Math.round((job.received / job.total) * 100))
    : 0
  return (
    <Stack gap="xs" className="shop-progress" aria-live="polite">
      <Text size="xs" role={job.phase === 'failed' ? 'alert' : 'status'}>
        {t(`shop.phases.${job.phase}`)}
        {job.phase === 'downloading' ? ` · ${progress}%` : ''}
      </Text>
      {!['complete', 'failed'].includes(job.phase) && (
        <Box
          as="progress"
          aria-label={t('shop.downloadProgress')}
          max={100}
          value={progress}
          width="100%"
        />
      )}
      {job.error && (
        <Text size="xs" color="dangerous">
          {job.error}
        </Text>
      )}
    </Stack>
  )
}
