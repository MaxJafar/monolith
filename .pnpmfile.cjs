// SPDX-License-Identifier: 0BSD
// Build tools that need the JavaScript compiler API use TypeScript 6.
const compilerAPI = 'npm:@typescript/typescript6@^6.0.2'

module.exports.hooks = {
  readPackage(manifest) {
    const ownPackage = /^(?:monolith$|monolith-|@monolith\/)/.test(
      manifest.name ?? ''
    )
    const compilerConsumer =
      manifest.dependencies?.typescript || manifest.peerDependencies?.typescript
    if (ownPackage || !compilerConsumer) return manifest
    manifest.dependencies = {
      ...manifest.dependencies,
      typescript: compilerAPI
    }
    if (manifest.peerDependencies) delete manifest.peerDependencies.typescript
    return manifest
  }
}
