import type {
  PlatformUpdateStatus,
  UpdateAction,
  UpdatePreferences
} from '@monolith/configs'

export type DesktopUpdater = (
  action: UpdateAction,
  preferences?: UpdatePreferences
) => Promise<PlatformUpdateStatus>

const key = Symbol.for('monolith.desktop.updater')
const shared = globalThis as unknown as Record<
  symbol,
  DesktopUpdater | undefined
>

export function setDesktopUpdater(updater: DesktopUpdater) {
  shared[key] = updater
}

export function getDesktopUpdater() {
  return shared[key]
}

type DesktopBackgroundReader = () => Promise<boolean>
const backgroundKey = Symbol.for('monolith.desktop.background')
const backgroundShared = globalThis as unknown as Record<
  symbol,
  DesktopBackgroundReader | undefined
>

export function setDesktopBackgroundReader(reader: DesktopBackgroundReader) {
  backgroundShared[backgroundKey] = reader
}

export function getDesktopBackgroundReader() {
  return backgroundShared[backgroundKey]
}
