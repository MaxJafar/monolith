import type { Document, Mode } from '../../shared'
import { addConnection, makeDocument, makeElement } from './model'

export type Template = 'blank' | 'mindmap' | 'workshop' | 'website' | 'social'

export const templates: { id: Template; mode: Mode; icon: string }[] = [
  { id: 'mindmap', mode: 'blackboard', icon: 'lucide:network' },
  { id: 'workshop', mode: 'blackboard', icon: 'lucide:sticky-note' },
  { id: 'website', mode: 'canvas', icon: 'lucide:layout-template' },
  { id: 'social', mode: 'canvas', icon: 'lucide:image' }
]

export function createTemplate(
  template: Template,
  mode: Mode,
  t: (key: string) => string
): Document {
  const document = makeDocument(mode, t(`modes.${mode}`))

  let page = document.pages[0]!

  if (template === 'mindmap') {
    const root = makeElement('node', { x: 120, y: 260 }, t('samples.bigIdea'))
    root.fill = '#c4b5fd'
    root.width = 240
    root.height = 120
    root.fontWeight = '700'
    page.elements.push(root)

    for (const [index, key] of ['discover', 'design', 'deliver'].entries()) {
      const node = makeElement(
        'node',
        { x: 520, y: 80 + index * 200 },
        t(`samples.${key}`)
      )
      node.fill = ['#93c5fd', '#86efac', '#fda4af'][index]!
      page.elements.push(node)
      page = addConnection(page, root.id, node.id)
    }
  } else if (template === 'workshop') {
    for (const [index, key] of [
      'working',
      'questions',
      'nextSteps'
    ].entries()) {
      const heading = makeElement(
        'text',
        { x: 80 + index * 290, y: 80 },
        t(`samples.${key}`)
      )
      heading.width = 240
      heading.fontWeight = '700'
      heading.fontSize = 24
      page.elements.push(heading)

      for (let row = 0; row < 2; row++) {
        const sticky = makeElement(
          'sticky',
          { x: 100 + index * 290, y: 180 + row * 210 },
          t('samples.addIdea')
        )
        sticky.fill = ['#fde68a', '#93c5fd', '#fda4af'][index]!
        page.elements.push(sticky)
      }
    }
  } else if (template === 'website' || template === 'social') {
    const social = template === 'social'
    const frame = makeElement(
      'frame',
      { x: 80, y: 60 },
      t(`templates.${template}`)
    )
    frame.width = social ? 720 : 1100
    frame.height = 720
    frame.fill = '#f5f3ff'
    page.elements.push(frame)
    const label = makeElement('text', { x: 130, y: 115 }, 'REDRAW STUDIO')
    label.align = 'left'
    label.fontSize = 16
    label.fontWeight = '700'
    label.textColor = '#6d28d9'
    const title = makeElement(
      'text',
      { x: 130, y: 230 },
      t('samples.makeSpace')
    )
    title.width = 620
    title.height = 230
    title.align = 'left'
    title.fontSize = 60
    title.fontWeight = '700'
    const subtitle = makeElement(
      'text',
      { x: 135, y: 490 },
      t('samples.startSomething')
    )
    subtitle.align = 'left'
    subtitle.width = 480
    subtitle.fontSize = 22
    const button = makeElement(
      'rectangle',
      { x: 135, y: 600 },
      t('samples.explore')
    )
    button.text = t('samples.explore')
    button.fill = '#6d28d9'
    button.strokeWidth = 0
    button.textColor = '#ffffff'
    button.width = 340
    button.height = 56
    page.elements.push(label, title, subtitle, button)

    if (!social) {
      const circle = makeElement(
        'ellipse',
        { x: 760, y: 220 },
        t('tools.ellipse')
      )
      circle.width = 300
      circle.height = 300
      circle.fill = '#c4b5fd'
      circle.strokeWidth = 0
      const square = makeElement(
        'rectangle',
        { x: 830, y: 390 },
        t('tools.rectangle')
      )
      square.width = 190
      square.height = 190
      square.rotation = -15
      square.fill = '#fda4af'
      square.strokeWidth = 0
      page.elements.push(circle, square)
    }
  }
  document.pages[0] = page

  return document
}
