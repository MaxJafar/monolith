// SPDX-License-Identifier: 0BSD
import { join } from 'node:path'

import { findProjectRoot } from '@monolith/configs/node'

export const ROOT_DIR = findProjectRoot()
export const LOCALES_DIR = join(ROOT_DIR, 'locales')
