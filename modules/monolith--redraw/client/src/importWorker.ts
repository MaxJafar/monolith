import { importNative } from './nativeImport'

self.onmessage = (
  event: MessageEvent<{ bytes: ArrayBuffer; filename: string }>
) => {
  try {
    self.postMessage({
      result: importNative(
        new Uint8Array(event.data.bytes),
        event.data.filename
      )
    })
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error &&
        ['nativeLimit', 'legacyPenpot', 'invalidNativeFile'].includes(
          error.message
        )
          ? error.message
          : 'invalidNativeFile'
    })
  }
}
