# Third-party notices

Monolith's current first-party software is licensed under [0BSD](LICENSE). That grant covers Monolith's implementation, not the separately licensed components and assets listed here. Preserve the notices required by those components when distributing them.

## Source replacement record

Earlier versions incorporated [LifeForge](https://github.com/Lifeforge-app/lifeforge), initiated by [Melvin Chia](https://github.com/melvinchia3636), under CC BY-NC-SA 4.0. The inherited addons have been retired and the remaining core implementations replaced. The [replacement ledger](legal/replacement-progress.json) records the work, verification, conventional declarations that still compare equal, and the limits of the review. [Source provenance](legal/source-provenance.json) preserves the historical references.

The 0BSD grant applies to the current replacement source. It does not relicense earlier commits or published archives containing upstream material. Database table names, wire formats and saved identifiers remain for compatibility with existing user data. Monolith is independently maintained and is not endorsed by the earlier project.

## Libraries and runtimes

React, BlockSuite, Yjs, Tauri, Swift, Go, PostgreSQL, Tiptap, d3 and other dependencies retain their own licenses. Dependency lockfiles and distributed package notices identify the versions used. The root license does not replace those terms.

## Bundled assets and data

- Icon collection attribution and license references: [icon notices](packages/ui/src/assets/icons/icon-notices.json). These notices are also included with native distributions.
- Website fonts: [Inter](apps/site/public/fonts/Inter-OFL.txt) and [JetBrains Mono](apps/site/public/fonts/JetBrainsMono-OFL.txt), under their included SIL Open Font Licenses.
- English OCR model: [Tesseract source, revision and checksum](apps/api/src/core/models/NOTICE.md), under the included [Apache-2.0 license](apps/api/src/core/models/LICENSE). The model was obtained directly from that pinned source.
- Gym exercise data: [dataset source and MIT notice](modules/monolith--gym/NOTICE.md). Third-party exercise images and animations are not distributed.
- Redraw's embedded libraries and icons: [library licenses](modules/monolith--redraw/THIRD_PARTY_LICENSES.txt) and [icon license](modules/monolith--redraw/client/ICONS-LICENSE.txt).

The Monolith mark and cover are original project assets. Names and marks of other products mentioned in design research remain their owners' property; no endorsement is implied.
