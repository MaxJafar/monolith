import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { ColorInput, IconInput, TextAreaInput, TextInput } from '@monolith/ui'

import { type Account, accountKinds } from '../../../core/schemas'
import { workspaceAPI } from '../../manifest'
import { AmountInput, SelectInput, SwitchRow } from '../components/controls'
import { accountIcons, currencyOptions } from '../utils/options'
import { type EditorData, EditorShell, Fields, save } from './EditorShell'

export function AccountEditor({
  data: { finance, item },
  onClose
}: {
  data: EditorData<Account>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const [draft, setDraft] = useState({
    name: item?.name ?? '',
    kind: item?.kind ?? 'bank',
    currency: item?.currency ?? finance.base,
    opening_balance: item?.opening_balance ?? '0',
    institution: item?.institution ?? '',
    icon: item?.icon ?? '',
    color: item?.color ?? '',
    interest_rate: item?.interest_rate ?? null,
    include_in_net_worth: item?.include_in_net_worth ?? true,
    archived: item?.archived ?? false,
    sort: item?.sort ?? finance.data?.accounts.length ?? 0,
    notes: item?.notes ?? ''
  })
  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))
  const locked = !!item?.transactions

  return (
    <EditorShell
      canSave={!!draft.name.trim()}
      icon={draft.icon || accountIcons[draft.kind]!}
      title={t(item ? 'editor.editAccount' : 'editor.newAccount')}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.accounts.delete.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () =>
          workspaceAPI.accounts.save.mutate({
            ...draft,
            name: draft.name.trim(),
            ...(item ? { id: item.id, expected_updated: item.updated } : {})
          })
        )
      }
    >
      <Fields>
        <TextInput
          autoFocus
          required
          icon="tabler:id"
          label="name"
          placeholder={t('placeholders.account')}
          value={draft.name}
          onChange={name => set({ name })}
        />
        <SelectInput
          label="accountKind"
          options={accountKinds.map(kind => ({
            value: kind,
            label: t(`accountKinds.${kind}`),
            icon: accountIcons[kind]
          }))}
          value={draft.kind}
          onChange={kind => set({ kind })}
        />
        <SelectInput
          disabled={locked}
          icon="tabler:currency"
          label="currency"
          options={currencyOptions(finance, [draft.currency])}
          value={draft.currency}
          onChange={currency => set({ currency })}
        />
        <AmountInput
          label="openingBalance"
          suffix={draft.currency}
          value={draft.opening_balance}
          onChange={value => set({ opening_balance: value ?? '0' })}
        />
        <TextInput
          icon="tabler:building"
          label="institution"
          placeholder={t('placeholders.institution')}
          value={draft.institution}
          onChange={institution => set({ institution })}
        />
        {(draft.kind === 'savings' ||
          draft.kind === 'debt' ||
          draft.interest_rate) && (
          <AmountInput
            icon="tabler:percentage"
            label="interestRate"
            suffix="%"
            value={draft.interest_rate}
            onChange={interest_rate => set({ interest_rate })}
          />
        )}
        <IconInput
          label="icon"
          value={draft.icon}
          onChange={icon => set({ icon })}
        />
        <ColorInput
          label="color"
          value={draft.color}
          onChange={color => set({ color })}
        />
      </Fields>
      {locked && (
        <SwitchRow
          description="help.archive"
          label="inputs.archived"
          value={draft.archived}
          onChange={archived => set({ archived })}
        />
      )}
      <SwitchRow
        description="help.netWorth"
        label="inputs.includeInNetWorth"
        value={draft.include_in_net_worth}
        onChange={include_in_net_worth => set({ include_in_net_worth })}
      />
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
