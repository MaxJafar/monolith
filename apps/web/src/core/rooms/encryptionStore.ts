import {
  type RoomIdentity,
  type RoomPrivateIdentity,
  getNativeRuntime,
  roomFingerprint
} from '@monolith/api'

// IndexedDB can structured-clone non-extractable CryptoKeys. No private key or
// plaintext message is written to localStorage, the API, or the query cache.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('monolith-rooms-keys', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('keys')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(Error('Secure local key storage is unavailable'))
  })
}

export async function roomKeyStore<T>(
  key: string,
  value?: T
): Promise<T | undefined> {
  key =
    (getNativeRuntime()?.profile.serverId ?? window.location.origin) + ':' + key
  const db = await database()

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        'keys',
        value === undefined ? 'readonly' : 'readwrite'
      )
      const request =
        value === undefined
          ? tx.objectStore('keys').get(key)
          : tx.objectStore('keys').put(value, key)
      tx.oncomplete = () =>
        resolve(value === undefined ? request.result : value)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () =>
        reject(tx.error ?? Error('Key storage was interrupted'))
    })
  } finally {
    db.close()
  }
}

export const loadRoomIdentity = (account: string) =>
  roomKeyStore<RoomPrivateIdentity>('identity:' + account)

export const saveRoomIdentity = (identity: RoomPrivateIdentity) =>
  roomKeyStore('identity:' + identity.owner_id, identity)

export async function pinRoomIdentities(
  account: string,
  people: RoomIdentity[]
) {
  const fingerprints = await Promise.all(
    people.map(async p => [p.owner_id, await roomFingerprint(p)] as const)
  )
  const db = await database()

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('keys', 'readwrite')
      const store = tx.objectStore('keys')

      let changed = false

      for (const [id, fingerprint] of fingerprints) {
        const key = `${getNativeRuntime()?.profile.serverId ?? window.location.origin}:trust:${account}:${id}`
        const read = store.get(key)
        read.onsuccess = () => {
          if (read.result && read.result !== fingerprint) {
            changed = true
            tx.abort()
          } else if (!read.result) store.put(fingerprint, key)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () =>
        reject(
          Error(
            changed
              ? 'An encryption identity changed. Verify the participant’s recovery identity before continuing.'
              : 'Unable to store encryption trust'
          )
        )
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }

  return fingerprints
}
