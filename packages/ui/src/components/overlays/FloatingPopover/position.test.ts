import { describe, expect, it } from 'vitest'

import { positionPopover } from './position'

describe('anchored popovers', () => {
  const anchor = {
    left: 240,
    right: 272,
    top: 100,
    bottom: 132,
    width: 32,
    height: 32
  }
  it('sits beside the sidebar without reserving document space', () => {
    expect(
      positionPopover(
        anchor,
        { width: 344, height: 400 },
        { width: 3440, height: 1440 },
        'right',
        'start'
      )
    ).toEqual({ x: 278, y: 100 })
  })
  it('flips above a trigger near the bottom', () => {
    expect(
      positionPopover(
        { ...anchor, top: 800, bottom: 832 },
        { width: 320, height: 400 },
        { width: 1440, height: 900 },
        'bottom',
        'start'
      )
    ).toEqual({ x: 240, y: 394 })
  })
  it('clamps a large surface in a narrow window', () => {
    expect(
      positionPopover(
        anchor,
        { width: 500, height: 800 },
        { width: 320, height: 560 },
        'right',
        'start'
      )
    ).toEqual({ x: 12, y: 12 })
  })
  it('flips left when an inspector is at the right edge', () => {
    expect(
      positionPopover(
        { ...anchor, left: 1330, right: 1362 },
        { width: 320, height: 400 },
        { width: 1440, height: 900 },
        'right',
        'end'
      )
    ).toEqual({ x: 1004, y: 100 })
  })
  it('stays in the visible viewport when zoom or the on-screen keyboard shifts it', () => {
    const point = positionPopover(
      { ...anchor, left: 530, right: 562, top: 680, bottom: 712 },
      { width: 320, height: 420 },
      { width: 390, height: 300, left: 200, top: 400 },
      'bottom',
      'start'
    )
    expect(point).toEqual({ x: 258, y: 412 })
  })
})
