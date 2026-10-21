import { randomUUID, verify } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  type AddonCatalog,
  type AddonJob,
  type AddonRelease,
  addonCatalogSchema,
  addonIdSchema,
  compareReleaseVersions,
  coreAddonIds,
  releaseVersionSchema,
  retiredAddonIds
} from '@monolith/configs'
import { ModuleRegistry } from '@monolith/module-runtime/registry'

import { digest, unpackAddon } from './archive'
import { downloadRelease } from './download'

type Installation = {
  slot: string
  version: string
  previous?: string
  previousVersion?: string
  pending?: boolean
}
type State = Record<string, Installation>
type Options = {
  root: string
  hostVersion: string
  catalogFile?: string
  catalogUrl?: string
  publicKey?: string
  schemaFile?: string
  download?: typeof downloadRelease
  installed?: () => { id: string; version: string; directory: string }[]
}

/** Managed packages never overwrite the source checkout, data, or an earlier release. */
export class AddonShop {
  private state: State = {}
  private jobs: AddonJob[] = []
  private busy = false
  private catalog?: AddonCatalog
  private checked = 0
  private reload?: () => Promise<void>
  private loaded = false
  constructor(private readonly options: Options) {}
  get hostVersion() {
    return this.options.hostVersion
  }
  get configured() {
    return !!(this.options.catalogFile || this.options.catalogUrl)
  }
  private get directory() {
    return path.join(this.options.root, 'storage', 'addons')
  }
  private get stateFile() {
    return path.join(this.directory, 'installed.json')
  }
  setReload(reload: () => Promise<void>) {
    this.reload = reload
  }
  private installed() {
    return (
      this.options.installed?.() ??
      ModuleRegistry.entries.map(entry => ({
        id: entry.id,
        version: entry.version,
        directory: ModuleRegistry.getPath(entry.id)!
      }))
    )
  }
  async initialize() {
    if (this.loaded) return
    let saved: string
    try {
      saved = await fs.readFile(this.stateFile, 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      this.loaded = true
      return
    }
    const data = JSON.parse(saved) as State
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw Error('Invalid installed addon state')
    let retired = false
    for (const [id, value] of Object.entries(data)) {
      if (retiredAddonIds.has(id)) {
        delete data[id]
        retired = true
        continue
      }
      addonIdSchema.parse(id)
      if (!value || typeof value !== 'object')
        throw Error('Invalid installed addon state')
      releaseVersionSchema.parse(value.version)
      if (value.previousVersion)
        releaseVersionSchema.parse(value.previousVersion)
      if (
        (coreAddonIds as readonly string[]).includes(id) ||
        !/^[0-9a-zA-Z.-]+-[a-f0-9]{12}$/.test(value.slot) ||
        (value.previous &&
          !/^[0-9a-zA-Z.-]+-[a-f0-9]{12}$/.test(value.previous))
      )
        throw Error('Invalid installed addon state')
    }
    // An interrupted activation must never become the next boot's default.
    let recovered = retired
    for (const [id, value] of Object.entries(data))
      if (value.pending) {
        recovered = true
        if (value.previous && value.previousVersion)
          data[id] = { slot: value.previous, version: value.previousVersion }
        else delete data[id]
      }
    this.state = data
    this.loaded = true
    if (recovered) await this.persist(data)
  }
  async directories() {
    await this.initialize()
    return Object.fromEntries(
      Object.entries(this.state).map(([id, value]) => [
        id,
        path.join(this.directory, 'packages', id, value.slot)
      ])
    )
  }
  previousDirectory(id: string) {
    const previous = this.state[id]?.previous
    return previous
      ? path.join(this.directory, 'packages', id, previous)
      : undefined
  }
  async getCatalog(force = false): Promise<AddonCatalog> {
    if (!this.configured) return { format: 1, releases: [] }
    if (!force && this.catalog && Date.now() - this.checked < 300000)
      return this.catalog
    let bytes: Buffer
    if (this.options.catalogFile)
      bytes = await fs.readFile(this.options.catalogFile)
    else {
      if (!this.options.publicKey)
        throw Error('The host must configure the catalog verification key')
      const envelope = JSON.parse(
        (
          await (this.options.download ?? downloadRelease)(
            this.options.catalogUrl!,
            2 * 1024 * 1024
          )
        ).toString()
      )
      bytes = Buffer.from(envelope.payload ?? '', 'base64')
      if (
        !verify(
          null,
          bytes,
          this.options.publicKey,
          Buffer.from(envelope.signature ?? '', 'base64')
        )
      )
        throw Error('Catalog signature is invalid')
    }
    if (bytes.length > 1024 * 1024) throw Error('Catalog is too large')
    const catalog = addonCatalogSchema.parse(JSON.parse(bytes.toString()))
    catalog.releases = catalog.releases.filter(
      entry => !retiredAddonIds.has(entry.id)
    )
    if (
      catalog.releases.some(entry =>
        (coreAddonIds as readonly string[]).includes(entry.id)
      )
    )
      throw Error('Core packages cannot be installed through the shop')
    this.catalog = catalog
    this.checked = Date.now()
    return catalog
  }
  async snapshot() {
    await this.initialize()
    let catalog: AddonCatalog = { format: 1, releases: [] },
      error = ''
    try {
      catalog = await this.getCatalog()
    } catch (e) {
      error = (e as Error).message
    }
    return {
      releases: catalog.releases,
      jobs: this.jobs,
      configured: this.configured,
      error,
      hostVersion: this.hostVersion,
      managed: Object.keys(this.state)
    }
  }
  async start(id: string): Promise<AddonJob> {
    if (!this.reload) throw Error('Addon runtime is not ready')
    if (this.busy) throw Error('Another addon installation is running')
    this.busy = true
    let lock: Awaited<ReturnType<typeof fs.open>> | undefined
    try {
      await this.initialize()
      await fs.mkdir(this.directory, { recursive: true })
      const lockPath = path.join(this.directory, 'install.lock')
      try {
        lock = await fs.open(lockPath, 'wx')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        const previousLock = JSON.parse(await fs.readFile(lockPath, 'utf8'))
        if (!Number.isSafeInteger(previousLock.pid) || previousLock.pid <= 0)
          throw error
        try {
          process.kill(previousLock.pid, 0)
          throw error
        } catch (probe) {
          if ((probe as NodeJS.ErrnoException).code !== 'ESRCH') throw probe
        }
        await fs.unlink(lockPath)
        lock = await fs.open(lockPath, 'wx')
      }
      await lock.writeFile(
        JSON.stringify({ pid: process.pid, started: Date.now() })
      )
      const release = (await this.getCatalog(true)).releases.find(
        item => item.id === id
      )
      if (!release) throw Error('This addon has no published package')
      if (release.hostVersion !== this.hostVersion)
        throw Error('Update Monolith before installing this package')
      const installed = this.installed().find(item => item.id === id)
      if (
        installed &&
        compareReleaseVersions(release.version, installed.version) <= 0
      )
        throw Error('This version is already installed or older')
      // Files can be rolled back; arbitrary database changes cannot. Only identical schemas activate live.
      if (release.schemaHash) {
        const schema = installed
          ? await fs
              .readFile(path.join(installed.directory, 'server/dist/schema.js'))
              .catch(() => null)
          : null
        const approved = this.options.schemaFile
          ? JSON.parse(await fs.readFile(this.options.schemaFile, 'utf8'))
          : undefined
        const prepared =
          approved?.hostVersion === this.hostVersion &&
          approved?.schemas?.[id] === release.schemaHash
        if ((!schema || digest(schema) !== release.schemaHash) && !prepared)
          throw Error(
            'This package requires a host database migration. Deploy the matching server release first.'
          )
      }
      const job: AddonJob = {
        id: randomUUID(),
        addonId: id,
        version: release.version,
        phase: 'queued',
        received: 0,
        total: release.bytes
      }
      this.jobs = [job, ...this.jobs].slice(0, 30)
      const ownedLock = lock
      void this.install(release, job).finally(async () => {
        await ownedLock?.close()
        await fs
          .unlink(path.join(this.directory, 'install.lock'))
          .catch(() => undefined)
        this.busy = false
      })
      return job
    } catch (e) {
      if (lock) {
        await lock.close()
        await fs
          .unlink(path.join(this.directory, 'install.lock'))
          .catch(() => undefined)
      }
      this.busy = false
      if ((e as NodeJS.ErrnoException).code === 'EEXIST')
        throw Error('Another host process holds the addon installation lock')
      throw e
    }
  }
  private async persist(next: State) {
    await fs.mkdir(this.directory, { recursive: true })
    const temporary = `${this.stateFile}.${randomUUID()}.tmp`
    await fs.writeFile(temporary, JSON.stringify(next, null, 2), { flag: 'wx' })
    await fs.rename(temporary, this.stateFile)
    this.state = next
  }
  private async install(release: AddonRelease, job: AddonJob) {
    const previous = { ...this.state }
    let activated = false
    try {
      job.phase = 'downloading'
      const bytes = await (this.options.download ?? downloadRelease)(
        release.url,
        release.bytes,
        bytes => {
          job.received = bytes
        }
      )
      job.phase = 'verifying'
      const files = unpackAddon(bytes, release)
      job.phase = 'installing'
      const slot = `${release.version}-${release.sha256.slice(0, 12)}`
      const parent = path.join(this.directory, 'packages', release.id)
      const destination = path.join(parent, slot)
      const staging = path.join(parent, `.staging-${randomUUID()}`)
      await fs.mkdir(staging, { recursive: true })
      for (const file of files) {
        const target = path.join(staging, ...file.path.split('/'))
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, file.data, { flag: 'wx' })
      }
      // Reuse only a complete, byte-identical immutable slot after a failed activation.
      try {
        await fs.rename(staging, destination)
      } catch (e) {
        if (
          !['EEXIST', 'ENOTEMPTY'].includes(
            (e as NodeJS.ErrnoException).code ?? ''
          )
        )
          throw e
        for (const file of files)
          if (
            digest(await fs.readFile(path.join(destination, file.path))) !==
            digest(file.data)
          )
            throw Error('Existing addon slot differs from the verified package')
        if (
          path.dirname(path.resolve(staging)) !== path.resolve(parent) ||
          !path.basename(staging).startsWith('.staging-')
        )
          throw Error('Invalid staging path')
        await fs.rm(staging, { recursive: true })
      }
      const candidate = {
        slot,
        version: release.version,
        previous: previous[release.id]?.slot,
        previousVersion: previous[release.id]?.version
      }
      await this.persist({
        ...previous,
        [release.id]: { ...candidate, pending: true }
      })
      activated = true
      await this.reload!()
      if (
        !this.installed().some(
          entry => entry.id === release.id && entry.version === release.version
        )
      )
        throw Error('Addon did not load; restoring the previous version')
      await this.persist({ ...previous, [release.id]: candidate })
      job.phase = 'complete'
    } catch (e) {
      if (activated) {
        try {
          await this.persist(previous)
          await this.reload!()
        } catch {
          job.error =
            'Activation and recovery failed. Restart the host using the previous release.'
        }
      }
      job.error ??= e instanceof Error ? e.message : 'Installation failed'
      job.phase = 'failed'
    }
  }
}
