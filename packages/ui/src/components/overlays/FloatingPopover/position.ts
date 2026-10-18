export type PopoverAnchor = Pick<Element, 'getBoundingClientRect'>

/** Keep an anchored surface inside the usable viewport, including narrow windows. */
export function positionPopover(
  anchor: Pick<
    DOMRect,
    'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'
  >,
  size: { width: number; height: number },
  viewport: { width: number; height: number; left?: number; top?: number },
  side: 'bottom' | 'right',
  align: 'start' | 'end'
) {
  const gap = 6,
    edge = 12
  const left = (viewport.left ?? 0) + edge,
    top = (viewport.top ?? 0) + edge,
    right = (viewport.left ?? 0) + viewport.width - edge,
    bottom = (viewport.top ?? 0) + viewport.height - edge
  const width = Math.min(size.width, Math.max(0, viewport.width - edge * 2))
  const height = Math.min(size.height, Math.max(0, viewport.height - edge * 2))
  let x = align === 'end' ? anchor.right - width : anchor.left
  let y = anchor.bottom + gap
  if (side === 'right') {
    x = anchor.right + gap
    y = anchor.top
    if (x + width > right && anchor.left - width - gap >= left)
      x = anchor.left - width - gap
  } else if (y + height > bottom && anchor.top - height - gap >= top) {
    y = anchor.top - height - gap
  }
  return {
    x: Math.max(left, Math.min(x, right - width)),
    y: Math.max(top, Math.min(y, bottom - height))
  }
}
