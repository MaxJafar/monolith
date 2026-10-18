import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { SYSTEM_CATEGORIES, useFederation } from '@monolith/federation'
import {
  Alert,
  Button,
  ConfirmationModal,
  EmptyStateScreen,
  ModuleHeader,
  Stack,
  Text,
  WithQuery,
  toast,
  useModalStore
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import CategoryItem from './components/CategoryItem'
import ModifyCategoryModal from './components/ModifyCategoryModal'
import {
  type Category,
  CategoryConflict,
  type CategoryMap,
  deleteCategory,
  editCategories,
  reorderCategories
} from './model'

const endpoint = workspaceAPI.modules.categories
const systemKeys = new Set(SYSTEM_CATEGORIES.map(name => name.toLowerCase()))

export default function Categories() {
  const { t } = useTranslation('common.module-manager')
  const { open } = useModalStore()
  const federation = useFederation()
  const cache = useQueryClient()
  const query = useQuery(endpoint.list.queryOptions())
  const locked = useRef(false)

  const mutation = useMutation({
    mutationFn: (data: CategoryMap) => endpoint.update.mutate({ data }),
    onMutate: async data => {
      await cache.cancelQueries({ queryKey: endpoint.list.key })
      const previous = cache.getQueryData<CategoryMap>(endpoint.list.key)
      cache.setQueryData(endpoint.list.key, data)

      return { previous }
    },
    onError: (_error, _data, context) =>
      cache.setQueryData(endpoint.list.key, context?.previous),
    onSuccess: (_result, data) => {
      federation.setCategoryTranslations(data)
      void federation.refetch
        .current()
        .catch(() => toast.error(t('categoryEditor.refreshFailed')))
    }
  })

  async function save(next: CategoryMap) {
    if (locked.current) throw new Error(t('categoryEditor.saving'))
    locked.current = true

    try {
      await mutation.mutateAsync(next)
    } finally {
      locked.current = false
    }
  }

  function current() {
    return (
      cache.getQueryData<CategoryMap>(endpoint.list.key) ?? query.data ?? {}
    )
  }

  async function modify(updates: Category[], oldKey?: string) {
    try {
      await save(editCategories(current(), updates, oldKey))
    } catch (error) {
      if (error instanceof CategoryConflict)
        throw new Error(t('categoryEditor.duplicate'), { cause: error })
      throw error
    }
  }

  const create = (initialKeys?: string[]) =>
    open(ModifyCategoryModal, {
      openType: 'create',
      initialKeys,
      onSubmit: modify
    })

  async function move(source: string, target: string) {
    const before = current()
    const next = reorderCategories(before, source, target)

    if (next === before || locked.current) return

    try {
      await save(next)
    } catch {
      toast.error(t('categoryEditor.saveFailed'))
    }
  }

  function drop({ active, over }: DragEndEvent) {
    if (over) void move(String(active.id), String(over.id))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const data = query.data ?? {}
  const keys = Object.keys(data)
  const missing = [
    ...new Set(
      federation.moduleGroups.flatMap(group =>
        group.items.map(item => item.category.toLowerCase())
      )
    )
  ].filter(
    key =>
      !systemKeys.has(key) && !Object.prototype.hasOwnProperty.call(data, key)
  )

  return (
    <>
      <ModuleHeader
        icon="tabler:category"
        namespace="common.module-manager"
        title="categories"
        trailing={
          <Button
            disabled={mutation.isPending}
            icon="tabler:plus"
            namespace="common.module-manager"
            onClick={() => create()}
          >
            addCategory
          </Button>
        }
      />
      <WithQuery query={query}>
        {() => (
          <Stack gap="md">
            <Text color="muted" size="sm">
              {t('categoryEditor.orderHelp')}
            </Text>
            {missing.length > 0 && (
              <Alert type="warning">
                <Text>
                  {t('messages.categoriesMissingTranslations', {
                    count: missing.length
                  })}{' '}
                  {missing.join(', ')}
                </Text>
                <Button
                  disabled={mutation.isPending}
                  icon="tabler:plus"
                  namespace="common.module-manager"
                  variant="plain"
                  onClick={() => create(missing)}
                >
                  createMissing
                </Button>
              </Alert>
            )}
            {keys.length ? (
              <DndContext
                collisionDetection={closestCenter}
                sensors={sensors}
                onDragEnd={drop}
              >
                <SortableContext
                  items={keys}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack aria-busy={mutation.isPending} gap="xs">
                    {keys.map((key, index) => (
                      <CategoryItem
                        key={key}
                        busy={mutation.isPending}
                        first={index === 0}
                        item={{ key, value: data[key]! }}
                        last={index === keys.length - 1}
                        onDelete={() =>
                          open(ConfirmationModal, {
                            title: t('categoryEditor.deleteTitle', {
                              name: key
                            }),
                            description: t('categoryEditor.deleteDescription'),
                            onConfirm: () =>
                              save(deleteCategory(current(), key))
                          })
                        }
                        onEdit={() =>
                          open(ModifyCategoryModal, {
                            openType: 'update',
                            category: { key, value: data[key]! },
                            onSubmit: updates => modify(updates, key)
                          })
                        }
                        onMove={direction =>
                          void move(key, keys[index + direction]!)
                        }
                      />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>
            ) : (
              <EmptyStateScreen
                icon="tabler:category"
                message={{ id: 'category', namespace: 'common.module-manager' }}
              />
            )}
          </Stack>
        )}
      </WithQuery>
    </>
  )
}
