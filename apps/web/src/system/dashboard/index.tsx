// SPDX-License-Identifier: 0BSD
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Flex,
  ModuleHeader,
  Stack,
  Text,
  useModalStore
} from '@monolith/ui'

import DashboardGrid from './components/DashboardGrid'
import ManageWidgetsModal from './components/modals/ManageWidgetsModal'
import './index.css'
import WidgetProvider, { useWidgets } from './providers/WidgetProvider'

function DashboardContent() {
  const [editing, setEditing] = useState(false),
    wrapperRef = useRef<HTMLDivElement>(null)
  const { widgets } = useWidgets(),
    modal = useModalStore()
  const { t } = useTranslation('common.dashboard')
  return (
    <Stack ref={wrapperRef} flex="1" pb="xl">
      <ModuleHeader
        namespace="common.dashboard"
        trailing={
          <Flex gap="sm" wrap="wrap">
            <Button
              namespace="common.dashboard"
              variant="secondary"
              icon="tabler:layout-grid-add"
              onClick={() => modal.open(ManageWidgetsModal, { widgets })}
            >
              buttons.manageWidgets
            </Button>
            <Button
              namespace="common.dashboard"
              variant={editing ? 'primary' : 'plain'}
              icon={editing ? 'tabler:check' : 'tabler:layout-dashboard'}
              onClick={() => setEditing(value => !value)}
            >
              {editing ? 'buttons.lockLayout' : 'buttons.unlockLayout'}
            </Button>
          </Flex>
        }
      />
      {editing && (
        <Text role="status" color="muted" size="sm">
          {t('messages.editingLayoutHint')}
        </Text>
      )}
      <DashboardGrid wrapperRef={wrapperRef} canLayoutChange={editing} />
    </Stack>
  )
}
export default function Dashboard() {
  return (
    <WidgetProvider>
      <DashboardContent />
    </WidgetProvider>
  )
}
