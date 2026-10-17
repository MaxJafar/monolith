import type { Appearance } from '@monolith/blocks'
import { fontStylesheet } from '@monolith/blocks'

export function AppearanceFont({ font }: { font?: Appearance['font'] }) {
  const url = font ? fontStylesheet(font) : null

  return url ? (
    <link href={url} precedence="appearance-font" rel="stylesheet" />
  ) : null
}
