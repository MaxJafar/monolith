import { type Logger, createLogger } from '@monolith/log'

export const loaderLogger: Logger = createLogger({ name: 'Module Loader' })

export type { Logger }
