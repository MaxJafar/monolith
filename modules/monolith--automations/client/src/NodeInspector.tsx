import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  NumberInput,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { type Payload, payloadSchema } from '../../shared'
import { useAutomation } from './AutomationProvider'

function JsonField({
  value,
  onChange,
  disabled,
  label
}: {
  value: Payload
  onChange: (value: Payload) => void
  disabled: boolean
  label: string
}) {
  const { t } = useModuleTranslation(),
    [error, setError] = useState(''),
    { selected, fieldDrafts, fieldDraft } = useAutomation()
  const key = selected + ':' + label,
    draft = fieldDrafts[key] ?? JSON.stringify(value, null, 2)
  return (
    <Stack>
      <TextAreaInput
        placeholder=""
        label={label}
        value={draft}
        disabled={disabled}
        errorMsg={error}
        onChange={value => fieldDraft(key, value)}
      />
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => {
          try {
            onChange(payloadSchema.parse(JSON.parse(draft)))
            fieldDraft(key)
            setError('')
          } catch {
            setError(t('invalidJSON'))
          }
        }}
      >
        apply
      </Button>
    </Stack>
  )
}
export function NodeInspector() {
  const { t } = useModuleTranslation(),
    state = useAutomation(),
    { draft, selected, readOnly, busy, updateNode, removeNode, graph } = state
  const node = draft.graph.nodes.find(n => n.id === selected),
    locked = readOnly || busy
  if (!node)
    return (
      <Stack p="lg" className="automation-inspector">
        <Text color="muted">{t('selectNode')}</Text>
      </Stack>
    )
  const update = (changes: Payload) =>
    updateNode(node.id, { config: { ...node.config, ...changes } })
  return (
    <Stack
      gap="md"
      p="md"
      className="automation-inspector"
      overflowY="auto"
      aria-label={t('nodeSettings')}
    >
      <Flex align="center" justify="between">
        <Text weight="semibold">{t('nodeSettings')}</Text>
        <Text color="muted" size="sm">
          {t(`nodes.${node.kind}`)}
        </Text>
      </Flex>
      <TextInput
        placeholder=""
        label="nodeName"
        value={node.name}
        disabled={locked}
        onChange={name => updateNode(node.id, { name })}
      />
      {node.kind === 'trigger' && (
        <Text color="muted" size="sm">
          {t('triggerHelp')}
        </Text>
      )}
      {node.kind === 'set' && (
        <>
          <Text color="muted" size="sm">
            {t('expressionHelp')}
          </Text>
          <JsonField
            key={JSON.stringify(node.config)}
            label="values"
            disabled={locked}
            value={node.config.values as Payload}
            onChange={values => update({ values })}
          />
        </>
      )}
      {node.kind === 'condition' && (
        <>
          <TextInput
            placeholder=""
            label="dataPath"
            value={String(node.config.path ?? '')}
            disabled={locked}
            onChange={path => update({ path })}
          />
          <Stack gap="xs">
            <Text as="label" htmlFor="condition-operator" size="sm">
              {t('comparison')}
            </Text>
            <Box
              as="select"
              id="condition-operator"
              className="automation-select"
              disabled={locked}
              value={String(node.config.operator)}
              onChange={e => update({ operator: e.target.value })}
            >
              {['equals', 'notEquals', 'contains', 'greater', 'exists'].map(
                op => (
                  <option key={op} value={op}>
                    {t(`operators.${op}`)}
                  </option>
                )
              )}
            </Box>
          </Stack>
          <JsonField
            key={node.id + JSON.stringify(node.config.value)}
            label="compareValue"
            disabled={locked}
            value={{ value: node.config.value ?? null }}
            onChange={value => update({ value: value.value ?? null })}
          />
        </>
      )}
      {node.kind === 'http' && (
        <>
          <Flex gap="xs">
            {['GET', 'POST'].map(method => (
              <Button
                key={method}
                variant={node.config.method === method ? 'secondary' : 'plain'}
                disabled={locked}
                namespace={false}
                onClick={() => update({ method })}
              >
                {method}
              </Button>
            ))}
          </Flex>
          <TextInput
            placeholder=""
            label="url"
            value={String(node.config.url)}
            disabled={locked}
            onChange={url => update({ url })}
          />
          <Text size="sm" color="muted">
            {t('httpHelp')}
          </Text>
          {node.config.method === 'POST' && (
            <JsonField
              key={JSON.stringify(node.config.body)}
              label="requestBody"
              value={(node.config.body ?? {}) as Payload}
              disabled={locked}
              onChange={body => update({ body })}
            />
          )}
        </>
      )}
      {node.kind === 'delay' && (
        <NumberInput
          icon="lucide:clock"
          label="milliseconds"
          disabled={locked}
          value={Number(node.config.ms)}
          onChange={ms => update({ ms })}
        />
      )}
      {node.kind === 'output' && (
        <Text color="muted" size="sm">
          {t('outputHelp')}
        </Text>
      )}
      <Text weight="medium" size="sm">
        {t('connections')}
      </Text>
      {draft.graph.edges
        .filter(e => e.source === node.id || e.target === node.id)
        .map(edge => (
          <Flex key={edge.id} align="center" justify="between" gap="sm">
            <Text size="sm">
              {draft.graph.nodes.find(n => n.id === edge.source)?.name} →{' '}
              {draft.graph.nodes.find(n => n.id === edge.target)?.name} ·{' '}
              {t(`ports.${edge.port}`)}
            </Text>
            <Button
              variant="plain"
              icon="lucide:x"
              disabled={locked}
              aria-label={t('disconnect')}
              onClick={() =>
                graph({
                  ...draft.graph,
                  edges: draft.graph.edges.filter(e => e.id !== edge.id)
                })
              }
            />
          </Flex>
        ))}
      {node.kind !== 'trigger' && (
        <Button
          dangerous
          variant="plain"
          icon="lucide:trash-2"
          disabled={locked}
          onClick={() => removeNode(node.id)}
        >
          removeNode
        </Button>
      )}
    </Stack>
  )
}
