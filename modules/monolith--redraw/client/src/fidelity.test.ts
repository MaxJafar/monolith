import { strToU8, zipSync } from 'fflate'
import { parseSchema } from 'kiwi-schema'
import { describe, expect, it } from 'vitest'

import { figFixture, penpotFixture } from '../../import-fixtures'
import { importNative, readArchive } from './nativeImport'

describe('Native design fidelity', () => {
  it('keeps Penpot gradient stops, clipping, editable curves and prototype targets', () => {
    const files = readArchive(penpotFixture()),
      frame = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'

    for (const [path, bytes] of files) {
      if (!path.endsWith('.json') || path === 'manifest.json') continue

      const value = JSON.parse(new TextDecoder().decode(bytes))

      if (value.id === frame) {
        value.showContent = false
        delete value.layout
      }

      if (value.type === 'rect') {
        value.type = 'path'
        value.content = 'M40 50 C40 90 140 90 140 50Z'
        value.fills = [
          {
            fillColorGradient: {
              type: 'linear',
              startX: 0,
              startY: 0,
              endX: 1,
              endY: 1,
              stops: [
                { offset: 0, color: '#ff0000', opacity: 0.5 },
                { offset: 1, color: '#0000ff', opacity: 1 }
              ]
            }
          }
        ]
        value.interactions = [
          {
            eventType: 'click',
            actionType: 'navigate',
            destination: frame,
            animation: { animationType: 'dissolve', duration: 300 }
          }
        ]
      }
      files.set(path, strToU8(JSON.stringify(value)))
    }

    const result = importNative(
        zipSync(Object.fromEntries(files)),
        'design.penpot'
      ),
      [container, path] = result.document.pages[0]!.elements
    expect(container!.clipContent).toBe(true)
    expect(path!.vector![0]!.nodes[0]!.out).toEqual({ x: 40, y: 90 })
    expect(path!.gradient?.stops[0]).toEqual({
      color: '#ff0000',
      opacity: 0.5,
      offset: 0
    })
    expect(path!.prototype).toMatchObject({
      target: container!.id,
      action: 'navigate',
      transition: 'dissolve',
      duration: 300
    })
    expect(
      result.warnings.some(w =>
        ['paints', 'masks', 'paths', 'prototypes'].includes(w.code)
      )
    ).toBe(false)
  })
  it('keeps Figma font metrics and inverts gradient transforms, including prototype links', () => {
    const schema = parseSchema(`
      enum Type { DOCUMENT=0; CANVAS=1; FRAME=2; TEXT=3; }
      enum PaintType { SOLID=0; GRADIENT_LINEAR=1; }
      enum InteractionType { ON_CLICK=0; }
      enum ConnectionType { INTERNAL_NODE=0; }
      enum NavigationType { NAVIGATE=0; }
      enum TransitionType { DISSOLVE=0; }
      enum NumberUnits { PIXELS=0; PERCENT=1; }
      struct GUID { uint sessionID; uint localID; }
      struct Point { float x; float y; }
      struct Matrix { float m00; float m01; float m02; float m10; float m11; float m12; }
      struct Parent { GUID guid; string position; }
      struct Color { float r; float g; float b; float a; }
      struct Stop { float position; Color color; }
      struct Font { string family; string style; }
      struct Number { float value; NumberUnits units; }
      message Paint { PaintType type=1; Stop[] stops=2; Matrix transform=3; }
      message Event { InteractionType interactionType=1; }
      message Action { GUID transitionNodeID=1; TransitionType transitionType=2; float transitionDuration=3; ConnectionType connectionType=4; NavigationType navigationType=5; }
      message Interaction { Event event=1; Action[] actions=2; }
      message Text { string characters=1; }
      message Node { GUID guid=1; Type type=2; Parent parentIndex=3; string name=4; Point size=5; Matrix transform=6; Paint[] fillPaints=7; Font fontName=8; Number lineHeight=9; Number letterSpacing=10; float fontSize=11; Interaction[] prototypeInteractions=12; Text textData=13; bool clipsContent=14; }
      message Message { Node[] nodeChanges=1; }
    `)
    const id = (localID: number) => ({ sessionID: 0, localID })
    const result = importNative(
      figFixture(schema, {
        nodeChanges: [
          { guid: id(1), type: 'CANVAS', name: 'Page' },
          {
            guid: id(2),
            type: 'FRAME',
            name: 'Screen',
            size: { x: 600, y: 400 },
            clipsContent: true,
            parentIndex: { guid: id(1), position: 'a' }
          },
          {
            guid: id(3),
            type: 'TEXT',
            name: 'Go',
            textData: { characters: 'Hello' },
            fontSize: 20,
            fontName: { family: 'Arial', style: 'Bold' },
            lineHeight: { value: 30, units: 'PIXELS' },
            letterSpacing: { value: 10, units: 'PERCENT' },
            size: { x: 180, y: 70 },
            parentIndex: { guid: id(2), position: 'a' },
            fillPaints: [
              {
                type: 'GRADIENT_LINEAR',
                transform: { m00: 0, m01: 1, m02: 0, m10: -1, m11: 0, m12: 1 },
                stops: [
                  { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
                  { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
                ]
              }
            ],
            prototypeInteractions: [
              {
                event: { interactionType: 'ON_CLICK' },
                actions: [
                  {
                    transitionNodeID: id(2),
                    transitionType: 'DISSOLVE',
                    transitionDuration: 0.3,
                    connectionType: 'INTERNAL_NODE',
                    navigationType: 'NAVIGATE'
                  }
                ]
              }
            ]
          }
        ]
      }),
      'design.fig'
    )
    const [frame, text] = result.document.pages[0]!.elements
    expect(text).toMatchObject({
      fontFamily: 'Arial',
      fontWeight: '700',
      fontSize: 20,
      lineHeight: 1.5,
      letterSpacing: 2,
      textPadding: 0,
      verticalAlign: 'top'
    })
    expect(text!.gradient!.transform).toEqual([0, 1, -1, 0, 1, -0])
    expect(text!.prototype).toMatchObject({
      target: frame!.id,
      action: 'navigate',
      duration: 300
    })
    expect(frame!.clipContent).toBe(true)
  })
})
