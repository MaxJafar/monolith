import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Flex, Grid, Stack, Text, TextInput } from '@lifeforge/ui'

import { useDatabases } from '@/DatabaseProvider'

import { type Field, type FieldKind, fieldKind } from '../../../shared'
import { SelectInput } from './SelectInput'

export function FieldEditor({
  field,
  onDone
}: {
  field?: Field
  onDone: () => void
}) {
  const { api: forgeAPI, data, base, run, busy } = useDatabases()
  const { t } = useModuleTranslation()
  const [name, setName] = useState(field?.name ?? '')
  const [kind, setKind] = useState<FieldKind>(field?.kind ?? 'text')

  const [optionsText, setOptionsText] = useState(
    field?.config.options.join(', ') ?? ''
  )

  const [target, setTarget] = useState(
    data.bases.find(item => item.id !== base?.id)?.id ?? base?.id ?? ''
  )

  const [reverseName, setReverseName] = useState('')
  const [cardinality, setCardinality] = useState<'one' | 'many'>('many')

  const [reverseCardinality, setReverseCardinality] = useState<'one' | 'many'>(
    'many'
  )

  async function save() {
    if (!base) return

    const options = optionsText
      .split(',')
      .map(option => option.trim())
      .filter(Boolean)
    const result = await run(() =>
      field
        ? forgeAPI.updateField
            .input({ id: field.id })
            .mutate({ name, kind, options })
        : forgeAPI.createField.mutate({
            base_id: base.id,
            name,
            kind,
            options,
            target_base_id: kind === 'relation' ? target : null,
            reverse_name: reverseName || undefined,
            cardinality,
            reverse_cardinality: reverseCardinality
          })
    )

    if (result) onDone()
  }

  const cardinalities = ['one', 'many'].map(value => ({
    value,
    label: t(`cardinality.${value}`)
  }))

  return (
    <Stack bg={{ base: 'bg-100', dark: 'bg-900' }} gap="md" p="lg" r="lg">
      <Text as="h3" size="lg" weight="semibold">
        {t(field ? 'editField' : 'addField')}
      </Text>
      {!field && (
        <Flex gap="sm" wrap="wrap">
          <Button
            icon="tabler:calendar"
            variant="secondary"
            onClick={() => {
              setKind('date')
              setName(t('propertyPresets.date'))
              setOptionsText('')
            }}
          >
            dateProperty
          </Button>
          <Button
            icon="tabler:tags"
            variant="secondary"
            onClick={() => {
              setKind('multi-select')
              setName(t('propertyPresets.tags'))
              setOptionsText('')
            }}
          >
            tagsProperty
          </Button>
          <Button
            icon="tabler:user"
            variant="secondary"
            onClick={() => {
              setKind('person')
              setName(t('propertyPresets.owner'))
              setOptionsText('')
            }}
          >
            ownerProperty
          </Button>
        </Flex>
      )}
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <TextInput
          required
          icon="tabler:forms"
          label="inputs.fieldName"
          placeholder=""
          value={name}
          onChange={setName}
        />
        {field?.kind !== 'relation' && (
          <SelectInput
            label={t('inputs.fieldType')}
            options={fieldKind.options
              .filter(value => !field || value !== 'relation')
              .map(value => ({ value, label: t(`fieldTypes.${value}`) }))}
            value={kind}
            onChange={value => setKind(value as FieldKind)}
          />
        )}
        {['select', 'multi-select'].includes(kind) && (
          <Stack gap="xs">
            <TextInput
              icon="tabler:tags"
              label="inputs.options"
              placeholder=""
              value={optionsText}
              onChange={setOptionsText}
            />
            <Text color="muted">{t('optionsHint')}</Text>
          </Stack>
        )}
        {kind === 'relation' && !field && (
          <>
            <SelectInput
              label={t('inputs.targetBase')}
              options={data.bases.map(base => ({
                value: base.id,
                label: base.name
              }))}
              value={target}
              onChange={setTarget}
            />
            <TextInput
              icon="tabler:arrows-exchange"
              label="inputs.reverseName"
              placeholder=""
              value={reverseName}
              onChange={setReverseName}
            />
            <SelectInput
              label={t('inputs.cardinality')}
              options={cardinalities}
              value={cardinality}
              onChange={value => setCardinality(value as 'one' | 'many')}
            />
            <SelectInput
              label={t('inputs.reverseCardinality')}
              options={cardinalities}
              value={reverseCardinality}
              onChange={value => setReverseCardinality(value as 'one' | 'many')}
            />
          </>
        )}
      </Grid>
      {field && (
        <Text color="muted">
          {t(field.kind === 'relation' ? 'relationTypeHelp' : 'typeChangeHelp')}
        </Text>
      )}
      {kind === 'relation' && <Text color="muted">{t('relationHelp')}</Text>}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!name.trim() || (kind === 'relation' && !field && !target)}
          icon="tabler:check"
          loading={busy}
          onClick={() => {
            void save()
          }}
        >
          save
        </Button>
        <Button variant="secondary" onClick={onDone}>
          cancel
        </Button>
        {field && (
          <Button
            dangerous
            icon="tabler:trash"
            variant="secondary"
            onClick={() => {
              if (window.confirm(t('confirmDeleteField')))
                void run(async () => {
                  await forgeAPI.removeField
                    .input({ id: field.id })
                    .mutate(undefined)
                  onDone()
                })
            }}
          >
            delete
          </Button>
        )}
      </Flex>
    </Stack>
  )
}
