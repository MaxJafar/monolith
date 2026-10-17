import dayjs from 'dayjs'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Icon, Stack, Text } from '@monolith/ui'

import { useAutomation } from './AutomationProvider'

export function RunInspector() {
  const { t } = useModuleTranslation(),
    { history, result, setResult, setSelected, setTab } = useAutomation()
  return (
    <Flex
      className="automation-runs"
      gap="none"
      minHeight="28rem"
      direction={{ base: 'column', md: 'row' }}
    >
      <Stack
        p="md"
        width={{ base: '100%', md: '18rem' }}
        flexShrink="0"
        gap="sm"
        overflowY="auto"
      >
        <Text weight="semibold">{t('recentRuns')}</Text>
        {history.isPending && <Text role="status">{t('loading')}</Text>}
        {history.error && (
          <Stack role="alert">
            <Text>{history.error.message}</Text>
            <Button variant="secondary" onClick={() => void history.refetch()}>
              retry
            </Button>
          </Stack>
        )}
        {history.data?.length === 0 && <Text color="muted">{t('noRuns')}</Text>}
        {history.data?.map(run => (
          <Button
            key={run.id}
            variant={result?.id === run.id ? 'secondary' : 'plain'}
            namespace={false}
            justify="start"
            onClick={() => setResult(run)}
          >
            <Icon
              icon={
                run.status === 'error'
                  ? 'lucide:circle-alert'
                  : 'lucide:circle-check'
              }
            />
            <Stack gap="xs">
              <Text size="sm">
                {dayjs(run.started).format('MMM D, HH:mm:ss')}
              </Text>
              <Text size="sm" color="muted">
                {t(`status.${run.status}`)} · {run.duration_ms} ms · v
                {run.revision}
              </Text>
            </Stack>
          </Button>
        ))}
      </Stack>
      <Stack p="lg" gap="md" flex="1" minWidth="0" overflowY="auto">
        {!result ? (
          <Text color="muted">{t('selectRun')}</Text>
        ) : (
          <>
            <Flex align="center" gap="sm">
              <Icon
                icon={
                  result.status === 'error'
                    ? 'lucide:circle-alert'
                    : 'lucide:circle-check'
                }
              />
              <Text weight="semibold">{t(`status.${result.status}`)}</Text>
              <Text color="muted" size="sm">
                {result.duration_ms} ms · {result.steps.length} {t('steps')}
              </Text>
            </Flex>
            {result.error && (
              <Text color="dangerous" role="alert">
                {result.error}
              </Text>
            )}
            {result.steps.map((step, index) => (
              <Box
                as="details"
                key={index}
                className="automation-step"
                p="md"
                r="md"
              >
                <Flex as="summary" align="center" justify="between" gap="sm">
                  <Text weight="medium">
                    {index + 1}. {step.name}
                  </Text>
                  <Text color="muted" size="sm">
                    {step.status} · {step.duration_ms} ms
                  </Text>
                </Flex>
                <Stack mt="md">
                  <Button
                    variant="plain"
                    onClick={() => {
                      setSelected(step.node_id)
                      setTab('editor')
                    }}
                  >
                    showNode
                  </Button>
                  {step.error && <Text color="dangerous">{step.error}</Text>}
                  <Text size="sm" weight="medium">
                    {t('input')}
                  </Text>
                  <Box as="pre" className="automation-json" overflowX="auto">
                    {JSON.stringify(step.input, null, 2)}
                  </Box>
                  <Text size="sm" weight="medium">
                    {t('output')}
                  </Text>
                  <Box as="pre" className="automation-json" overflowX="auto">
                    {JSON.stringify(step.output, null, 2)}
                  </Box>
                </Stack>
              </Box>
            ))}
          </>
        )}
      </Stack>
    </Flex>
  )
}
