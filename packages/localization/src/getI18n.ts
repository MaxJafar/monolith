// SPDX-License-Identifier: 0BSD
import type { i18n } from 'i18next'

const localization: { instance: i18n | null } = { instance: null }
export const getI18n = (): i18n | null => localization.instance
export function setI18n(instance: i18n): void {
  localization.instance = instance
}
