import { Box, Button, Flex, FloatingPopover, Stack, Text } from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useSidebarPreferences } from '@/core/routing/components/Sidebar/SidebarPreferences'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import {
  earnedXP,
  levelProgress
} from '../../../../../modules/monolith--databases/urpgShared'
import { Avatar, CharacterWidget, Meter } from './Character'
import { useRpg } from './useRpg'

export default function SidebarCharacter() {
  const { active } = useWorkspace()
  const { preferences } = useSidebarPreferences()
  if (
    !active?.enabled_modules.includes('urpg') ||
    !preferences.widgets.some(widget => widget.id === 'rpgProfile')
  )
    return null
  return <PinnedCharacter key={active.id} />
}

function PinnedCharacter() {
  const rpg = useRpg()
  const { t } = useTranslation('common', { keyPrefix: 'urpg' })
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  function closeVitals() {
    // Undo can remove its focused row before this surface is dismissed.
    if (document.activeElement === document.body)
      anchor?.focus({ preventScroll: true })
    setAnchor(null)
  }
  const { state } = rpg
  const total = (kind: 'calories' | 'water') =>
    state?.vitals
      .filter(entry => entry.day === rpg.day && entry.kind === kind)
      .reduce((sum, entry) => sum + entry.amount, 0) ?? 0
  const progress = levelProgress(state ? earnedXP(state) : 0)

  return (
    <Box
      as="section"
      aria-label={t('widgets.rpgProfile')}
      className="urpg-sidebar-character"
      flexShrink="0"
      mx="sm"
      mb="sm"
      p="sm"
      r="sm"
    >
      {state ? (
        <Stack gap="sm">
          <Flex gap="sm" align="center" mb="xs">
            <Avatar state={state} />
            <Stack gap="xs" minWidth="0" flex="1">
              <Button
                as={Link}
                to={`/urpg?workspace=${rpg.workspaceId}`}
                namespace={false}
                variant="plain"
                justify="start"
                p="none"
                className="urpg-character-name"
                title={state.character.name}
              >
                <Text truncate size="sm" weight="semibold" color="primary">
                  {state.character.name}
                </Text>
              </Button>
              <Text size="xs" color="muted">
                {t('level', { level: progress.level })} ·{' '}
                {earnedXP(state).toLocaleString()} XP
              </Text>
            </Stack>
            {!rpg.readOnly && (
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:plus"
                p="xs"
                aria-label={t('logVitals')}
                onClick={event => {
                  event.currentTarget.focus({ preventScroll: true })
                  setAnchor(event.currentTarget)
                }}
              />
            )}
          </Flex>
          <Meter
            label={t('health')}
            value={total('calories')}
            target={state.character.calorieTarget}
            color="#df6464"
            unit="kcal"
          />
          <Meter
            label={t('mana')}
            value={total('water')}
            target={state.character.waterTarget}
            color="#568fdf"
            unit="ml"
          />
          <Meter
            label={t('experience')}
            value={progress.current}
            target={progress.required}
            color="var(--selection-color)"
            unit="XP"
          />
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text size="xs" color="muted" role="status">
            {t(
              rpg.query.isPending
                ? 'loading'
                : rpg.query.isError
                  ? 'loadError'
                  : 'createCharacter'
            )}
          </Text>
          {rpg.query.isError && (
            <Button
              namespace={false}
              variant="plain"
              onClick={() => void rpg.query.refetch()}
            >
              {t('retry')}
            </Button>
          )}
        </Stack>
      )}
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          width={300}
          label={t('todayVitals')}
          className="urpg-popover"
          onClose={closeVitals}
        >
          <Stack gap="md">
            <Flex justify="between" align="center">
              <Text size="sm" weight="semibold">
                {t('todayVitals')}
              </Text>
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:x"
                aria-label={t('close')}
                onClick={closeVitals}
              />
            </Flex>
            <CharacterWidget mode="vitals" />
            <Text size="xs" color="muted">
              {t('vitalsHelp')}
            </Text>
          </Stack>
        </FloatingPopover>
      )}
    </Box>
  )
}
