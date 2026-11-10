import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Flex,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { decimalsOf } from '../../../core/currencies'
import type { TaxRule } from '../../../core/schemas'
import { applyTax } from '../../../core/tax'
import { workspaceAPI } from '../../manifest'
import { AmountInput, Segmented, SwitchRow } from '../components/controls'
import { type EditorData, EditorShell, Fields, save } from './EditorShell'

type Component = TaxRule['components'][number]

const emptyComponent = (label: string): Component => ({
  label,
  brackets: [{ up_to: null, rate: '0' }]
})

export function TaxRuleEditor({
  data: { finance, item },
  onClose
}: {
  data: EditorData<TaxRule>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const [draft, setDraft] = useState({
    name: item?.name ?? '',
    kind: item?.kind ?? 'vat',
    rate: item?.rate ?? '18',
    inclusive: item?.inclusive ?? true,
    withheld: item?.withheld ?? false,
    components: item?.components.length
      ? item.components
      : [emptyComponent(t('presets.rules.income_tax'))],
    archived: item?.archived ?? false,
    notes: item?.notes ?? ''
  })

  const [sample, setSample] = useState<string | null>('1000')

  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))
  const setComponent = (index: number, next: Component | null) =>
    set({
      components: next
        ? draft.components.map((component, at) =>
            at === index ? next : component
          )
        : draft.components.filter((_, at) => at !== index)
    })

  const valid =
    !!draft.name.trim() &&
    (draft.kind === 'vat'
      ? !!draft.rate
      : draft.components.length > 0 &&
        draft.components.every(
          component =>
            component.label.trim() &&
            component.brackets.length &&
            component.brackets.every(bracket => bracket.rate !== '')
        ))

  let example = null

  if (sample && valid)
    try {
      example = applyTax(
        sample,
        draft.kind === 'vat' ? (draft.inclusive ? 'gross' : 'net') : 'gross',
        { ...draft, components: draft.kind === 'vat' ? [] : draft.components },
        decimalsOf(finance.base)
      )
    } catch {
      example = null
    }

  return (
    <EditorShell
      wide
      canSave={valid}
      deleteLabel={t('messages.deleteRule')}
      icon={draft.kind === 'vat' ? 'tabler:receipt-tax' : 'tabler:file-invoice'}
      title={t(item ? 'editor.editRule' : 'editor.newRule')}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.taxRules.delete.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () =>
          workspaceAPI.taxRules.save.mutate({
            ...draft,
            name: draft.name.trim(),
            components: draft.kind === 'vat' ? [] : draft.components,
            ...(item ? { id: item.id, expected_updated: item.updated } : {})
          })
        )
      }
    >
      <Segmented
        label={t('inputs.ruleKind')}
        options={(['vat', 'income'] as const).map(value => ({
          value,
          label: t(`ruleKinds.${value}`),
          icon: value === 'vat' ? 'tabler:receipt-tax' : 'tabler:file-invoice'
        }))}
        value={draft.kind}
        onChange={kind => set({ kind })}
      />
      <Fields>
        <TextInput
          autoFocus
          required
          icon="tabler:tag"
          label="name"
          placeholder={t('placeholders.rule')}
          value={draft.name}
          onChange={name => set({ name })}
        />
        {draft.kind === 'vat' && (
          <AmountInput
            required
            icon="tabler:percentage"
            label="rate"
            suffix="%"
            value={draft.rate}
            onChange={rate => set({ rate: rate ?? '' })}
          />
        )}
      </Fields>
      {draft.kind === 'vat' ? (
        <SwitchRow
          description="help.inclusive"
          label="inputs.inclusive"
          value={draft.inclusive}
          onChange={inclusive => set({ inclusive })}
        />
      ) : (
        <>
          <SwitchRow
            description="help.withheld"
            label="inputs.withheld"
            value={draft.withheld}
            onChange={withheld => set({ withheld })}
          />
          <Text color="muted" size="sm">
            {t('help.brackets')}
          </Text>
          {draft.components.map((component, index) => (
            <Stack key={index} className="finance-component" gap="sm">
              <Flex align="end" gap="sm">
                <TextInput
                  icon="tabler:tag"
                  label="componentLabel"
                  placeholder={t('presets.rules.income_tax')}
                  value={component.label}
                  onChange={label =>
                    setComponent(index, { ...component, label })
                  }
                />
                <Button
                  dangerous
                  aria-label={t('buttons.removeComponent')}
                  icon="tabler:trash"
                  variant="plain"
                  onClick={() => setComponent(index, null)}
                />
              </Flex>
              {component.brackets.map((bracket, at) => (
                <Flex key={at} align="end" className="finance-bracket" gap="sm">
                  <AmountInput
                    icon="tabler:arrow-bar-to-up"
                    label="upTo"
                    suffix={finance.base}
                    value={bracket.up_to}
                    onChange={up_to =>
                      setComponent(index, {
                        ...component,
                        brackets: component.brackets.map((item, i) =>
                          i === at ? { ...item, up_to } : item
                        )
                      })
                    }
                  />
                  <AmountInput
                    icon="tabler:percentage"
                    label="rate"
                    suffix="%"
                    value={bracket.rate}
                    onChange={rate =>
                      setComponent(index, {
                        ...component,
                        brackets: component.brackets.map((item, i) =>
                          i === at ? { ...item, rate: rate ?? '' } : item
                        )
                      })
                    }
                  />
                  <Button
                    aria-label={t('buttons.removeBracket')}
                    disabled={component.brackets.length < 2}
                    icon="tabler:minus"
                    variant="plain"
                    onClick={() =>
                      setComponent(index, {
                        ...component,
                        brackets: component.brackets.filter((_, i) => i !== at)
                      })
                    }
                  />
                </Flex>
              ))}
              <Button
                icon="tabler:plus"
                variant="plain"
                onClick={() =>
                  setComponent(index, {
                    ...component,
                    brackets: [
                      ...component.brackets,
                      { up_to: null, rate: '0' }
                    ]
                  })
                }
              >
                addBracket
              </Button>
            </Stack>
          ))}
          <Button
            disabled={draft.components.length >= 8}
            icon="tabler:plus"
            variant="secondary"
            onClick={() =>
              set({ components: [...draft.components, emptyComponent('')] })
            }
          >
            addComponent
          </Button>
        </>
      )}
      <Stack className="finance-preview" gap="xs">
        <AmountInput
          icon="tabler:calculator"
          label="sampleAmount"
          suffix={finance.base}
          value={sample}
          onChange={setSample}
        />
        {example && (
          <>
            {example.parts.map(part => (
              <Flex key={part.label} justify="between">
                <Text color="muted" size="sm">
                  {part.label}
                </Text>
                <Text className="finance-figure" size="sm">
                  {finance.native(part.tax, finance.base)}
                </Text>
              </Flex>
            ))}
            {[
              ['preview.gross', example.gross],
              [
                draft.kind === 'vat' ? 'preview.vat' : 'preview.tax',
                example.tax
              ],
              ['preview.net', example.net]
            ].map(([label, value]) => (
              <Flex key={label} justify="between">
                <Text color="muted" size="sm">
                  {t(label!)}
                </Text>
                <Text className="finance-figure" size="sm" weight="medium">
                  {finance.native(value, finance.base)}
                </Text>
              </Flex>
            ))}
          </>
        )}
      </Stack>
      <TextAreaInput
        icon="tabler:notes"
        label="notes"
        placeholder=""
        value={draft.notes}
        onChange={notes => set({ notes })}
      />
    </EditorShell>
  )
}
