import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { kinds } from '../../shared'
import { useAutomation } from './AutomationProvider'
import { FlowCanvas, nodeIcons } from './FlowCanvas'
import { NodeInspector } from './NodeInspector'
import { RunInspector } from './RunInspector'

export function Editor({ onBack }: { onBack: () => void }) {
  const { t } = useModuleTranslation(),
    state = useAutomation(),
    { draft, dirty, busy, readOnly, change, tab, setTab, result } = state
  const locked = busy || readOnly
  return (
    <Stack className="automations" gap="md" p={{ base: 'sm', md: 'lg' }}>
      <Flex gap="sm" align="center" justify="between" wrap="wrap">
        <Flex gap="sm" align="center">
          <Button
            variant="plain"
            icon="lucide:arrow-left"
            aria-label={t('back')}
            onClick={onBack}
          />
          <Stack gap="xs">
            <Text as="h1" size="xl" weight="semibold">
              {draft.title}
            </Text>
            <Text color="muted" size="sm">
              {dirty ? t('unsaved') : `${t('revision')} ${draft.revision}`}
            </Text>
          </Stack>
        </Flex>
        <Flex align="center" gap="sm">
          <Text color="muted" size="sm">
            {t(draft.enabled ? 'active' : 'paused')}
          </Text>
          <Switch
            aria-label={t('enableWorkflow')}
            value={draft.enabled}
            disabled={locked}
            onChange={enabled => change({ enabled })}
          />
          <Button
            variant="secondary"
            disabled={locked || !dirty}
            loading={busy}
            icon="lucide:save"
            onClick={() => void state.save()}
          >
            save
          </Button>
          <Button
            disabled={locked || dirty}
            loading={busy}
            icon="lucide:play"
            onClick={() => void state.run()}
          >
            run
          </Button>
        </Flex>
      </Flex>
      {state.error && (
        <Text color="dangerous" role="alert">
          {state.error}
        </Text>
      )}
      {readOnly && <Text color="muted">{t('readOnly')}</Text>}
      <Flex justify="between" gap="sm" wrap="wrap">
        <Flex gap="xs">
          <Button
            variant={tab === 'editor' ? 'secondary' : 'plain'}
            onClick={() => setTab('editor')}
          >
            editor
          </Button>
          <Button
            variant={tab === 'history' ? 'secondary' : 'plain'}
            onClick={() => setTab('history')}
          >
            history
          </Button>
        </Flex>
        <Flex gap="xs">
          <Button
            variant="plain"
            icon="lucide:undo-2"
            aria-label={t('undo')}
            disabled={locked || !state.canUndo}
            onClick={() => state.travel('undo')}
          />
          <Button
            variant="plain"
            icon="lucide:redo-2"
            aria-label={t('redo')}
            disabled={locked || !state.canRedo}
            onClick={() => state.travel('redo')}
          />
          <Button
            variant="plain"
            icon="lucide:download"
            onClick={state.download}
          >
            export
          </Button>
        </Flex>
      </Flex>
      {tab === 'editor' ? (
        <>
          <Flex gap="sm" wrap="wrap" aria-label={t('nodeLibrary')}>
            {kinds
              .filter(kind => kind !== 'trigger')
              .map(kind => (
                <Button
                  key={kind}
                  variant="plain"
                  namespace={false}
                  icon={nodeIcons[kind]}
                  disabled={locked}
                  onClick={() => state.addNode(kind)}
                >
                  {t(`nodes.${kind}`)}
                </Button>
              ))}
          </Flex>
          <Flex
            className="automation-workbench"
            direction={{ base: 'column', lg: 'row' }}
            minHeight="36rem"
            overflow="hidden"
            r="lg"
          >
            <FlowCanvas />
            <NodeInspector key={state.selected} />
          </Flex>
          {result && (
            <Flex
              align="center"
              gap="sm"
              justify="between"
              className="automation-result"
              p="md"
              r="md"
            >
              <Text>
                {t(`status.${result.status}`)} · {result.steps.length}{' '}
                {t('steps')} · {result.duration_ms} ms
              </Text>
              <Button variant="plain" onClick={() => setTab('history')}>
                inspectRun
              </Button>
            </Flex>
          )}
          <Flex
            gap="lg"
            direction={{ base: 'column', md: 'row' }}
            align="start"
          >
            <Stack flex="1">
              <TextInput
                placeholder=""
                label="workflowName"
                value={draft.title}
                disabled={locked}
                onChange={title => change({ title })}
              />
              <TextInput
                placeholder=""
                label="description"
                value={draft.description}
                disabled={locked}
                onChange={description => change({ description })}
              />
              <NumberInput
                icon="lucide:clock"
                label="intervalMinutes"
                disabled={locked}
                value={draft.interval_minutes}
                onChange={interval_minutes => change({ interval_minutes })}
              />
              <Text size="sm" color="muted">
                {t('scheduleHelp')}
              </Text>
            </Stack>
            <Box flex="1" width="100%">
              <TextAreaInput
                placeholder=""
                label="triggerData"
                value={state.input}
                disabled={locked}
                onChange={state.setInput}
              />
              <Text size="sm" color="muted">
                {t('inputHelp')}
              </Text>
            </Box>
          </Flex>
        </>
      ) : (
        <RunInspector />
      )}
    </Stack>
  )
}
