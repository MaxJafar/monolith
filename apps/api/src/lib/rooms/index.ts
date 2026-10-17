import { defineRoutes } from '@monolith/server-utils'

import {
  beginUpload,
  discardUpload,
  finishUpload,
  getChunk,
  putChunk
} from './attachments'
import { callState } from './calls'
import { keys, myIdentity, registerIdentity } from './encryption'
import { notifications } from './notifications'
import {
  create,
  edit,
  list,
  mentions,
  people,
  pin,
  react,
  receipt,
  send,
  timeline,
  update
} from './routes'

export default defineRoutes({
  callState,
  notifications,
  keys,
  myIdentity,
  registerIdentity,
  beginUpload,
  putChunk,
  finishUpload,
  getChunk,
  discardUpload,
  list,
  people,
  create,
  update,
  timeline,
  send,
  edit,
  react,
  pin,
  receipt,
  mentions
})
