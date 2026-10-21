// SPDX-License-Identifier: 0BSD
import type { RequestHandler } from 'express'
import multer from 'multer'

import type { StagedFile } from '../../core/types'
import { releaseStaged, stageStream } from './staging'

const staging: multer.StorageEngine = {
  _handleFile(_request, file, done) {
    stageStream(file.stream, file.originalname, file.mimetype).then(
      result => done(null, result as unknown as Express.Multer.File),
      error => done(error)
    )
  },
  _removeFile(_request, file, done) {
    releaseStaged(file as unknown as StagedFile).then(
      () => done(null),
      error => done(error)
    )
  }
}
export default function fieldsUploadMiddleware(
  fields: Record<string, number>
): RequestHandler {
  const parts = Object.entries(fields).map(([name, maxCount]) => ({
    name,
    maxCount
  }))
  return (request, response, next) => {
    const configured = Number(process.env.FILE_UPLOAD_MAX_BYTES)
    const fileSize =
      Number.isSafeInteger(configured) && configured > 0
        ? configured
        : 2 * 1024 ** 3
    multer({ storage: staging, limits: { fileSize } }).fields(parts)(
      request,
      response,
      next
    )
  }
}
