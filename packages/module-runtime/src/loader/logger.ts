// SPDX-License-Identifier: 0BSD
import { createLogger } from '@monolith/log'

export type { Logger } from '@monolith/log'

export const loaderLogger = createLogger({ name: 'Module Loader' })
