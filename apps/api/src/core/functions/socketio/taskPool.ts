import { randomUUID } from 'node:crypto'

import type {
  AddToTaskPoolFunc,
  GlobalTaskPool,
  UpdateTaskInPoolFunc
} from '@monolith/server-utils'

import { createServiceLogger } from '../logging'

export const globalTaskPool: GlobalTaskPool = Object.create(null)
const logger = createServiceLogger('tasks')

export const addToTaskPool: AddToTaskPoolFunc = (io, details) => {
  const id = randomUUID()
  const now = new Date()
  const task = { ...details, createdAt: now, updatedAt: now }
  globalTaskPool[id] = task
  io.emit('taskPoolUpdate', { ...task, taskId: id })
  return id
}

export const updateTaskInPool: UpdateTaskInPoolFunc = (io, id, patch) => {
  const current = globalTaskPool[id]
  if (!current) return
  const task = { ...current, ...patch, updatedAt: new Date() }
  globalTaskPool[id] = task
  const finished = task.status === 'failed' || task.status === 'completed'
  if (finished) delete globalTaskPool[id]
  io.emit('taskPoolUpdate', { ...task, taskId: id })
  if (task.status === 'failed')
    logger.error('Background task failed', { taskId: id, error: patch.error })
}
