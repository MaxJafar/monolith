import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import { TechLabImportError, previewTechLabImport } from '../importer'
import {
  backupSchema,
  deleteInputSchema,
  deviceSaveSchema,
  deviceSchema,
  deviceTelemetrySchema,
  historySchema,
  importDataSchema,
  importPreviewInputSchema,
  importPreviewSchema,
  importSummarySchema,
  runChecksSchema,
  serviceSaveSchema,
  serviceSchema,
  settingsSaveSchema,
  settingsSchema,
  snapshotSchema
} from '../shared'
import { registerTechLabCollector } from './collectors'
import endpoints from './endpoints'
import { ownerId } from './model'
import {
  type TechLabDatabase,
  deleteDevice,
  deleteService,
  getHistory,
  getSettings,
  getSnapshot,
  importInventory,
  ownedDevice,
  runTechLabChecks,
  saveDevice,
  saveService,
  saveSettings
} from './store'
import { readGlancesTelemetry } from './telemetry'

const idQuery = z.object({ id: z.string().uuid() })

export const snapshot = endpoints
  .query({
    description: 'Read your devices, services and observed monitor health',
    output: { OK: snapshotSchema }
  })
  .callback(async ({ db, req, res, response }) => {
    const owner = ownerId(res)
    registerTechLabCollector(
      (req as unknown as { db: TechLabDatabase }).db,
      owner
    )

    return response.ok(await getSnapshot(db, owner))
  })

const deviceSave = endpoints
  .mutation({
    description: 'Create or update an owned device with a stale-edit guard',
    input: { body: deviceSaveSchema },
    output: { OK: deviceSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveDevice(db, ownerId(res), body))
  )
const deviceDelete = endpoints
  .mutation({
    description: 'Delete an owned device and detach its hosted services',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteDevice(db, ownerId(res), body.id, body.expected_updated)

    return response.noContent()
  })
const deviceTelemetry = endpoints
  .query({
    description: 'Read actual Glances telemetry from an owned device',
    input: { query: idQuery },
    output: { OK: deviceTelemetrySchema }
  })
  .callback(async ({ db, res, query, response }) => {
    const device = await ownedDevice(db, ownerId(res), query.id)

    if (!device.glances_url)
      return response.ok({
        status: 'disabled',
        message: 'Configure a Glances URL to read device telemetry.',
        captured_at: new Date().toISOString(),
        cpu_percent: null,
        ram_used_bytes: null,
        ram_total_bytes: null,
        uptime_seconds: null,
        filesystems: []
      })

    return response.ok(await readGlancesTelemetry(device.glances_url))
  })

export const devices = {
  save: deviceSave,
  delete: deviceDelete,
  telemetry: deviceTelemetry
}

const serviceSave = endpoints
  .mutation({
    description:
      'Create or update an owned service and its explicit monitor configuration',
    input: { body: serviceSaveSchema },
    output: { OK: serviceSchema }
  })
  .callback(async ({ db, req, res, body, response }) => {
    const owner = ownerId(res)
    const result = await saveService(db, owner, body)

    if (result.monitor_enabled)
      registerTechLabCollector(
        (req as unknown as { db: TechLabDatabase }).db,
        owner
      )

    return response.ok(result)
  })
const serviceDelete = endpoints
  .mutation({
    description:
      'Delete an owned service while retaining its historical check snapshots',
    input: { body: deleteInputSchema },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await deleteService(db, ownerId(res), body.id, body.expected_updated)

    return response.noContent()
  })

export const services = { save: serviceSave, delete: serviceDelete }

export const history = endpoints
  .query({
    description: 'Read a bounded history of actual checks for an owned service',
    input: {
      query: idQuery.extend({
        hours: z.coerce.number().int().min(1).max(720).default(24)
      })
    },
    output: { OK: historySchema }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(await getHistory(db, ownerId(res), query.id, query.hours))
  )

const run = endpoints
  .mutation({
    description:
      'Run an enabled owned monitor, or a bounded batch of due monitors',
    input: { query: z.object({ id: z.string().uuid().optional() }) },
    output: { OK: runChecksSchema }
  })
  .callback(async ({ db, req, res, query, response }) => {
    const owner = ownerId(res)
    registerTechLabCollector(
      (req as unknown as { db: TechLabDatabase }).db,
      owner
    )

    return response.ok(
      await runTechLabChecks(db, owner, query.id ? [query.id] : undefined)
    )
  })

export const checks = { run }

const settingsGet = endpoints
  .query({
    description: 'Read your Tech Lab settings',
    output: { OK: settingsSchema }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(await getSettings(db, ownerId(res)))
  )
const settingsSave = endpoints
  .mutation({
    description: 'Save Tech Lab settings with a stale-edit guard',
    input: { body: settingsSaveSchema },
    output: { OK: settingsSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await saveSettings(db, ownerId(res), body))
  )

export const settings = { get: settingsGet, save: settingsSave }

const importPreview = endpoints
  .mutation({
    description:
      'Preview a bounded Homepage YAML or native inventory import without network requests',
    input: { body: importPreviewInputSchema },
    output: { OK: importPreviewSchema }
  })
  .callback(async ({ body, response }) => {
    try {
      return response.ok(await previewTechLabImport(body))
    } catch (error) {
      if (error instanceof TechLabImportError)
        throw new ClientError(error.message, 400)
      throw error
    }
  })
const importApply = endpoints
  .mutation({
    description:
      'Atomically merge inventory into your workspace with monitoring disabled',
    input: { body: z.object({ data: importDataSchema }).strict() },
    output: { OK: importSummarySchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await importInventory(db, ownerId(res), body.data))
  )

export const imports = { preview: importPreview, apply: importApply }

export const exportData = endpoints
  .query({
    description:
      'Export owned inventory and settings without monitor history or credentials',
    output: { OK: backupSchema }
  })
  .callback(async ({ db, res, response }) => {
    const data = await getSnapshot(db, ownerId(res))

    return response.ok({
      format: 'zillion-tech-lab',
      version: 1,
      exported_at: new Date().toISOString(),
      devices: data.devices,
      services: data.services,
      settings: data.settings
    })
  })
