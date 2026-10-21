// SPDX-License-Identifier: 0BSD
import { APIError, fetchAPI } from '../client/fetch'
import {
  createEncryptionSession,
  decryptResponse,
  encryptRequest,
  initializeEncryption,
  isEncryptedResponse
} from '../crypto/encryption'

export async function encryptedRequest<Output>(
  host: string,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<Output> {
  async function exchange(): Promise<Output> {
    const prepared =
      method === 'GET'
        ? await createEncryptionSession(host)
        : await encryptRequest(body ?? {}, host)
    const result = await fetchAPI<unknown>(host, path, {
      method,
      ...('encryptedKey' in prepared
        ? { headers: { 'X-Monolith-Key': prepared.encryptedKey } }
        : { body: prepared.payload })
    })
    return isEncryptedResponse(result)
      ? decryptResponse<Output>(result, prepared.session)
      : (result as Output)
  }
  try {
    return await exchange()
  } catch (error) {
    // The server rejects these before executing the endpoint, so a single replay is safe.
    const stale =
      error instanceof APIError &&
      error.status === 400 &&
      [
        'Failed to decrypt payload',
        'Failed to decrypt encryption key'
      ].includes(error.message)
    if (!stale) throw error
    await initializeEncryption(host)
    return exchange()
  }
}
