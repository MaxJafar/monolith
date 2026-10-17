import NativeImportWorker from './importWorker?worker&inline'
import type { ImportResult } from './nativeImport'

export async function readNativeFile(
  file: File,
  signal?: AbortSignal
): Promise<ImportResult> {
  if (file.size > 32 * 1024 * 1024) throw Error('nativeLimit')

  const bytes = await file.arrayBuffer()

  if (signal?.aborted) throw Error('importCancelled')

  return new Promise((resolve, reject) => {
    const worker = new NativeImportWorker()
    const cleanup = () => {
      clearTimeout(timer)
      worker.terminate()
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      reject(Error('importCancelled'))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(Error('nativeLimit'))
    }, 15000)
    signal?.addEventListener('abort', abort, { once: true })

    worker.onmessage = event => {
      cleanup()
      if (event.data.error) reject(Error(event.data.error))
      else resolve(event.data.result)
    }

    worker.onerror = () => {
      cleanup()
      reject(Error('invalidNativeFile'))
    }
    worker.postMessage({ bytes, filename: file.name }, [bytes])
  })
}
