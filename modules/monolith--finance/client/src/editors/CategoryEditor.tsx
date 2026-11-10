import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { ColorInput, IconInput, TextInput } from '@monolith/ui'

import type { Category, WishlistList } from '../../../core/schemas'
import { workspaceAPI } from '../../manifest'
import { AmountInput, SelectInput, SwitchRow } from '../components/controls'
import { groupOptions, ruleOptions } from '../utils/options'
import { type EditorData, EditorShell, Fields, save } from './EditorShell'

export type CategoryPreset = {
  kind: 'income' | 'expense'
  parent_id?: string | null
}

export function CategoryEditor({
  data: { finance, item, preset },
  onClose
}: {
  data: EditorData<Category, CategoryPreset>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const kind = item?.kind ?? preset?.kind ?? 'expense'
  const hasChildren =
    !!item &&
    finance.data!.categories.some(category => category.parent_id === item.id)
  const [draft, setDraft] = useState({
    name: item?.name ?? '',
    parent_id: item?.parent_id ?? preset?.parent_id ?? null,
    icon: item?.icon ?? '',
    color: item?.color ?? '',
    budget: item?.budget ?? null,
    tax_rule_id: item?.tax_rule_id ?? null,
    archived: item?.archived ?? false,
    sort: item?.sort ?? 1000,
    notes: item?.notes ?? ''
  })
  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))
  const heading =
    kind === 'income'
      ? item
        ? 'editor.editStream'
        : 'editor.newStream'
      : item
        ? 'editor.editCategory'
        : draft.parent_id
          ? 'editor.newSubcategory'
          : 'editor.newCategory'

  return (
    <EditorShell
      canSave={!!draft.name.trim()}
      deleteLabel={t('messages.deleteCategory')}
      icon={
        draft.icon ||
        (kind === 'income' ? 'tabler:briefcase' : 'tabler:category')
      }
      title={t(heading)}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.categories.delete.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () =>
          workspaceAPI.categories.save.mutate({
            ...draft,
            kind,
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
          icon="tabler:tag"
          label="name"
          placeholder={t(
            kind === 'income' ? 'placeholders.stream' : 'placeholders.category'
          )}
          value={draft.name}
          onChange={name => set({ name })}
        />
        {!hasChildren && (
          <SelectInput
            label="group"
            options={groupOptions(
              finance,
              kind,
              t('labels.topLevel'),
              item?.id
            )}
            value={draft.parent_id ?? ''}
            onChange={parent_id => set({ parent_id: parent_id || null })}
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
        {kind === 'expense' && (
          <AmountInput
            icon="tabler:target-arrow"
            label="monthlyBudget"
            suffix={finance.base}
            value={draft.budget}
            onChange={budget => set({ budget })}
          />
        )}
        <SelectInput
          icon="tabler:receipt-tax"
          label="defaultTax"
          options={ruleOptions(finance, kind, t('labels.noTax'))}
          value={draft.tax_rule_id ?? ''}
          onChange={id => set({ tax_rule_id: id || null })}
        />
      </Fields>
      <SwitchRow
        description="help.archiveCategory"
        label="inputs.archived"
        value={draft.archived}
        onChange={archived => set({ archived })}
      />
    </EditorShell>
  )
}

export function ListEditor({
  data: { finance, item },
  onClose
}: {
  data: EditorData<WishlistList>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const [draft, setDraft] = useState({
    name: item?.name ?? '',
    icon: item?.icon ?? '',
    color: item?.color ?? '',
    sort: item?.sort ?? finance.data?.lists.length ?? 0,
    archived: item?.archived ?? false
  })
  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))

  return (
    <EditorShell
      canSave={!!draft.name.trim()}
      deleteLabel={t('messages.deleteList')}
      icon={draft.icon || 'tabler:list'}
      title={t(item ? 'editor.editList' : 'editor.newList')}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.wishlist.deleteList.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () =>
          workspaceAPI.wishlist.saveList.mutate({
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
          icon="tabler:list"
          label="name"
          placeholder={t('placeholders.list')}
          value={draft.name}
          onChange={name => set({ name })}
        />
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
    </EditorShell>
  )
}
