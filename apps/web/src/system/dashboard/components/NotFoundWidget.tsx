// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import {
  Button,
  ConfirmationModal,
  Stack,
  Text,
  Widget,
  useModalStore,
  usePersonalization
} from '@monolith/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'

import { readDashboardLayout } from '../utils/layout'

export default function NotFoundWidget({
  widgetId,
  dimension
}: {
  widgetId: string
  dimension: { w: number; h: number }
}) {
  const { dashboardLayout } = usePersonalization(),
    save = useUserPersonalization(),
    modal = useModalStore()
  const { t } = useTranslation('common.dashboard')
  function remove() {
    modal.open(ConfirmationModal, {
      title: t('empty.notFound.title'),
      description: t('empty.notFound.description'),
      confirmationButton: 'delete',
      onConfirm: () =>
        save.changeDashboardLayout(
          Object.fromEntries(
            Object.entries(readDashboardLayout(dashboardLayout)).map(
              ([name, tiles]) => [
                name,
                tiles.filter(tile => tile.i !== widgetId)
              ]
            )
          )
        )
    })
  }
  return (
    <Widget
      namespace={false}
      title={widgetId}
      icon="tabler:apps-off"
      actionComponent={
        <Button
          icon="tabler:trash"
          variant="plain"
          aria-label={t('empty.notFound.title')}
          onClick={remove}
        />
      }
    >
      {dimension.w > 1 && dimension.h > 1 && (
        <Stack gap="sm">
          <Text weight="medium">{t('empty.notFound.title')}</Text>
          <Text color="muted" size="sm">
            {t('empty.notFound.description')}
          </Text>
        </Stack>
      )}
    </Widget>
  )
}
