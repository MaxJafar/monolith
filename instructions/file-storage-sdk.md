# Monolith file storage

Routes receive a storage facade through `core.storage`. It scopes object access to the calling module and records metadata in the shared files table. Import public types, the reference schema, and provider construction from `@monolith/file-storage`; API-side staging and database wiring are exported by `@monolith/file-storage/server`.

## Upload lifecycle

Declare upload fields with the route's `media` contract. The handler receives a staged file with its original name, MIME type, byte count, temporary path, stream, and asynchronous buffer reader. Validate it before saving.

Call `core.storage.save({ file, currentKey, thumbs })`. An uploaded file creates a new object and reference. The sentinel `'keep'`, a null value, or an omitted file retains the current reference. The sentinel `'removed'` deletes the current object. Persist the returned reference's key in the owning record.

Image thumbnail requests use size strings such as `256x0`; SVGs are not raster-thumbnail inputs. Thumbnail metadata is returned with the reference. Treat keys as opaque identifiers instead of reconstructing storage paths.

New bytes and metadata are prepared before an old object is removed. Failed old-object cleanup is reported and the prior object may remain. Database transactions do not make an external filesystem or S3 write transactional; handle failures and retain enough information to reconcile orphaned objects.

## Retrieval

A reference describes `key`, `originalName`, `mimeType`, `size`, and a list of thumbnail descriptors. Use `fileReferenceSchema` in API outputs and the typed API client's `getMedia({ key, thumb })` to construct media requests.

`GET /files/get` requires authentication and looks up the registered file through the caller's scoped database connection. Unknown or inaccessible keys return 404. Responses use private caching. The optional `download=true` parameter requests an attachment disposition with a sanitized original filename.

Server handlers can call `getReference(key)`, `get(key, { thumb })`, and `delete(key)`. These operations retain module scoping; do not use a raw provider to bypass it.

## Deployment configuration

Set `FILE_STORAGE_PROVIDER` to `local` or `s3`. Local storage uses `FILE_STORAGE_LOCAL_PATH`, with a staging area beneath that directory. The S3 provider reads bucket, region, endpoint, access key, secret key, and path-style settings from the corresponding `FILE_STORAGE_S3_*` variables.

Keep storage and credentials outside replaceable release bundles. Back up metadata and object bytes together. Consult the environment examples for available settings and the existing migration guide when importing an older installation.
