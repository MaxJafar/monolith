import { useQuery } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import { useAPIEndpoint, useAuth } from '@monolith/api'
import {
  type AddonJob,
  type AddonRelease,
  compareReleaseVersions
} from '@monolith/configs'

import coreAPI from '@/core/utils/workspaceAPI'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import { coreAddonPaths } from '../../../../../../../modules/monolith--databases/navigationShared'
import { addonSlug } from './filters'

export type ShopEntry = {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  category: string
  kind: 'addon' | 'widget'
  enabled: boolean
  installed?: string
  release?: AddonRelease
  update: boolean
  job?: AddonJob
}
function useShopState() {
  const { active, refresh } = useWorkspace(),
    { userData } = useAuth(),
    endpoint = useAPIEndpoint()
  const { t, i18n } = useTranslation('common.module-manager')
  const options = coreAPI.modules.list.queryOptions(),
    shopOptions = coreAPI.modules.shop.catalog.queryOptions()
  const modules = useQuery({
    ...options,
    queryKey: [...options.queryKey, endpoint, userData?.id]
  })
  const catalog = useQuery({
    ...shopOptions,
    queryKey: [...shopOptions.queryKey, endpoint, userData?.id],
    refetchInterval: query =>
      query.state.data?.jobs.some(
        job => !['complete', 'failed'].includes(job.phase)
      )
        ? 750
        : 30000
  })
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [pending, setPending] = useState('')
  const lock = useRef(false)
  function setExternalBusy(value: boolean) {
    lock.current = value
    setPending(value ? 'urpg' : '')
  }
  const entries = new Map<string, ShopEntry>()
  for (const module of modules.data ?? []) {
    const slug = addonSlug(module.name)
    if (coreAddonPaths.has(slug)) continue
    entries.set(module.id, {
      id: module.id,
      slug,
      title: i18n.t(`apps.${module.name}:title`, {
        defaultValue: module.displayName
      }),
      description: i18n.t(`apps.${module.name}:description`, {
        defaultValue: module.description
      }),
      icon: module.icon,
      category: module.category,
      kind: module.experience?.kind === 'widget' ? 'widget' : 'addon',
      enabled: !!active?.enabled_modules.includes(slug),
      installed: module.version,
      update: false
    })
  }
  for (const release of catalog.data?.releases ?? []) {
    const existing = entries.get(release.id),
      slug = addonSlug(release.id)
    entries.set(release.id, {
      id: release.id,
      slug,
      title: release.name,
      description: release.description,
      icon: release.icon,
      category: release.category,
      kind: release.kind,
      enabled: false,
      ...existing,
      release,
      update:
        !!existing?.installed &&
        compareReleaseVersions(release.version, existing.installed) > 0
    })
  }
  for (const item of entries.values())
    item.job = catalog.data?.jobs.find(job => job.addonId === item.id)
  async function run(id: string, action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setPending(id)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      lock.current = false
      setPending('')
    }
  }
  async function toggle(item: ShopEntry) {
    if (!active || active.role !== 'owner' || !item.installed) return
    await run(item.id, async () => {
      await workspaceAPI.workspaces.update
        .input({ id: active.id })
        .mutate({
          name: active.name,
          icon: active.icon,
          profile: active.profile,
          description: active.description,
          enabled_modules: item.enabled
            ? active.enabled_modules.filter(id => id !== item.slug)
            : [...active.enabled_modules, item.slug]
        })
      await refresh()
      setNotice(
        t(item.enabled ? 'catalog.disabledNotice' : 'catalog.enabledNotice', {
          name: item.title
        })
      )
    })
  }
  async function install(item: ShopEntry) {
    await run(item.id, async () => {
      await coreAPI.modules.shop.install.mutate({ id: item.id })
      await catalog.refetch()
    })
  }
  async function check() {
    await run('check', async () => {
      await coreAPI.modules.shop.checkUpdates.mutate(undefined)
      await catalog.refetch()
      await modules.refetch()
      setNotice(t('shop.checked'))
    })
  }
  return {
    entries: [...entries.values()],
    active,
    pending,
    error:
      error ||
      catalog.error?.message ||
      modules.error?.message ||
      catalog.data?.error,
    notice,
    modules,
    catalog,
    toggle,
    install,
    check,
    setExternalBusy,
    canEnable: active?.role === 'owner',
    canManage: !!catalog.data?.canManage
  }
}
const Context = createContext<ReturnType<typeof useShopState> | null>(null)
export function ShopProvider({ children }: { children: ReactNode }) {
  const state = useShopState()
  return <Context value={state}>{children}</Context>
}
export function useShop() {
  const state = useContext(Context)
  if (!state) throw Error('Shop provider missing')
  return state
}
