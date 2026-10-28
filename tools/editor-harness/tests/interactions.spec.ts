import { type Page, expect, test } from '@playwright/test'

const errors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', error =>
    errors.get(page)!.push(error.stack ?? error.message)
  )
  page.on('console', message => {
    if (message.type() === 'error') errors.get(page)!.push(message.text())
  })
  await page.goto('/')
  await expect(page.locator('affine-paragraph').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Select or drag block' }).first()
  ).toBeAttached()
})

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

test('callouts contain live databases and retain their color through undo and snapshot restore', async ({
  page
}) => {
  const ids = await page.evaluate(() => {
    const adapter = window.monolithHarness!
    const note = adapter.store.root!.children.find(
      model => model.flavour === 'affine:note'
    )!
    const database = note.children.find(
      model => model.flavour === 'monolith:linked-database'
    )!
    const callout = adapter.store.addBlock('affine:callout', {}, note.id)
    adapter.store.addBlock('affine:paragraph', { type: 'text' }, callout)
    adapter.store.resetHistory()
    if (!adapter.move([database.id], callout))
      throw Error('Database nesting rejected')
    adapter.select([callout])
    adapter.setBackground('#d9730d')
    return { callout, database: database.id }
  })
  const callout = page.locator(`affine-callout[data-block-id="${ids.callout}"]`)
  await expect(callout.locator('monolith-application-block')).toHaveCount(1)
  await expect(callout).toHaveAttribute('data-monolith-background', 'true')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(callout).toHaveAttribute('data-monolith-background', 'false')
  await expect(callout.locator('monolith-application-block')).toHaveCount(1)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(callout).toHaveAttribute('data-monolith-background', 'true')
  await page.getByRole('button', { name: 'Round-trip snapshot' }).click()
  await expect(page.getByTestId('snapshot')).toContainText('"equivalent": true')
  await expect(page.getByTestId('snapshot')).toContainText('#d9730d')
})

test('the slash menu creates an editable callout', async ({ page }) => {
  await page
    .locator('affine-paragraph')
    .first()
    .locator('[contenteditable="true"]')
    .first()
    .click()
  await page.keyboard.press('Home')
  await page.keyboard.type('/callout', { delay: 50 })
  await page.getByRole('option', { name: 'Callout', exact: true }).click()
  const callout = page.locator('affine-callout')
  await expect(callout).toBeVisible()
  await expect(callout.locator('affine-paragraph')).toHaveCount(1)
  await callout.locator('[contenteditable="true"]').first().click()
  await page.keyboard.type('Reference callout')
  await expect(callout).toContainText('Reference callout')
})

test('typing /inline data finds the database action at the current paragraph', async ({
  page
}) => {
  const paragraph = page.locator('affine-paragraph').first()
  const id = await paragraph.getAttribute('data-block-id')
  await paragraph.locator('[contenteditable="true"]').first().click()
  await page.keyboard.press('Home')
  await page.keyboard.type('/inline data', { delay: 70 })
  await expect(
    page.getByRole('option', { name: 'Inline database', exact: true })
  ).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Database command')).toContainText(
    `"blockId":"${id}"`
  )
  await expect(page.getByLabel('Database command')).toContainText(
    '"mode":"table"'
  )
  await expect(paragraph).not.toContainText('/inline data')
  await expect(paragraph).toContainText('First paragraph')
})

test('a rerendered duplicate block wrapper never gains a second drag handle', async ({
  page
}) => {
  const first = page.locator('affine-paragraph').first()
  const id = await first.getAttribute('data-block-id')
  await first.evaluate(element => {
    const duplicate = document.createElement('div')
    duplicate.dataset.blockId = (element as HTMLElement).dataset.blockId
    const grip = element
      .querySelector('.monolith-document-grip')!
      .cloneNode(true)
    duplicate.append(grip)
    element.append(duplicate)
  })
  await expect(page.locator(`[data-grip-id="${id}"]`)).toHaveCount(1)
  await page.getByRole('button', { name: 'Rerender shell' }).click()
  await expect(page.locator(`[data-grip-id="${id}"]`)).toHaveCount(1)
})

test('the Go conversion snapshot imports every block and renders its literal text', async ({
  page
}) => {
  const result = await page.evaluate(async () => {
    const runtime = window.monolithHarness!
    const block = (
      id: string,
      flavour: string,
      props: Record<string, unknown> = {},
      children: unknown[] = [],
      version = 1
    ) => ({ type: 'block', id, flavour, version, props, children })
    const snapshot = {
      type: 'page',
      meta: {
        id: 'converted-page',
        title: 'Migrated',
        createDate: 0,
        tags: []
      },
      blocks: block(
        'root',
        'affine:page',
        {
          title: {
            '$blocksuite:internal:text$': true,
            delta: [{ insert: 'Migrated' }]
          }
        },
        [
          block('surface', 'affine:surface', { elements: {} }),
          block('note', 'affine:note', {}, [
            block('paragraph', 'affine:paragraph', {
              type: 'text',
              text: {
                '$blocksuite:internal:text$': true,
                delta: [{ insert: '# literally plain text' }]
              }
            })
          ])
        ],
        2
      )
    }
    const restored = await runtime.store
      .getTransformer()
      .snapshotToDoc(snapshot as never)
    if (!restored) throw Error('Import failed')
    const host = new (
      runtime.constructor as typeof import('../../../packages/ui/src/components/display/DocumentEditor/adapter').DocumentAdapter
    )(restored)
    document.body.append(host.host)
    return restored.root?.children.map(model => [
      model.flavour,
      model.children.length
    ])
  })
  expect(result).toEqual([
    ['affine:surface', 0],
    ['affine:note', 1]
  ])
  await expect(
    page.locator('editor-host').last().locator('affine-paragraph')
  ).toContainText('# literally plain text')
})

test('dividers import in a note and inside a column', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const runtime = window.monolithHarness!
    const block = (
      id: string,
      flavour: string,
      props: Record<string, unknown> = {},
      children: unknown[] = [],
      version = 1
    ) => ({ type: 'block', id, flavour, version, props, children })
    const text = (insert: string) => ({
      '$blocksuite:internal:text$': true,
      delta: [{ insert }]
    })
    const restored = await runtime.store.getTransformer().snapshotToDoc({
      type: 'page',
      meta: { id: 'divider-page', title: 'Dividers', createDate: 0, tags: [] },
      blocks: block(
        'root',
        'affine:page',
        { title: text('Dividers') },
        [
          block('surface', 'affine:surface', { elements: {} }),
          block('note', 'affine:note', {}, [
            block('note-divider', 'affine:divider'),
            block('columns', 'monolith:columns', { count: 2 }, [
              block('left', 'monolith:column', {}, [
                block('column-divider', 'affine:divider')
              ]),
              block('right', 'monolith:column', {}, [
                block('right-text', 'affine:paragraph', {
                  type: 'text',
                  text: text('Right')
                })
              ])
            ])
          ])
        ],
        2
      )
    } as never)

    return ['note-divider', 'column-divider'].map(
      id => restored?.getModelById(id)?.flavour ?? null
    )
  })
  expect(result).toEqual(['affine:divider', 'affine:divider'])
})

test('selection, ordered group movement and one-step undo survive React renders', async ({
  page
}) => {
  const grips = page.locator('affine-paragraph > .monolith-document-grip')
  await grips.nth(0).click({ force: true })
  await grips.nth(1).click({ force: true, modifiers: ['Shift'] })
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(2)
  await page.getByRole('button', { name: 'Rerender shell' }).click()
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(2)
  await page.locator('editor-host').focus()
  await page.keyboard.press('Control+Alt+ArrowDown')
  await expect(page.locator('affine-paragraph').nth(0)).toContainText(
    'Third paragraph'
  )
  await page.keyboard.press('Control+z')
  await expect(page.locator('affine-paragraph').nth(0)).toContainText(
    'First paragraph'
  )
})

test('group drag crosses columns and keeps the two paragraphs in order', async ({
  page
}) => {
  const grips = page.locator('affine-paragraph > .monolith-document-grip')
  await grips.nth(0).click({ force: true })
  await grips.nth(1).click({ force: true, modifiers: ['Shift'] })
  const source = await grips.nth(0).boundingBox()
  const destination = await page.locator('monolith-column').nth(1).boundingBox()
  await page.mouse.move(source!.x + 10, source!.y + 10)
  await page.mouse.down()
  await page.mouse.move(destination!.x + 60, destination!.y + 5, { steps: 15 })
  await expect(page.locator('.monolith-document-drop')).toBeVisible()
  await expect(page.locator('.monolith-block-drag-preview')).toContainText(
    'First paragraph'
  )
  await expect(page.locator('[data-monolith-dragging="true"]')).toHaveCount(2)
  await page.mouse.up()
  await expect(page.locator('[data-monolith-dragging="true"]')).toHaveCount(0)
  const paragraphs = page
    .locator('monolith-column')
    .nth(1)
    .locator('affine-paragraph')
  await expect(paragraphs).toHaveCount(3)
  await expect(paragraphs.nth(0)).toContainText('First paragraph')
  await expect(paragraphs.nth(1)).toContainText('Second paragraph')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(
    page.locator('monolith-column').nth(1).locator('affine-paragraph')
  ).toHaveCount(1)
})

test('database insertion respects a selected block inside a column', async ({
  page
}) => {
  await page
    .locator('monolith-column')
    .first()
    .locator('.monolith-document-grip')
    .click({ force: true })
  const point = await page.evaluate(() => {
    const adapter = window.monolithHarness!
    const point = adapter.insertionPoint()!
    return {
      parent: adapter.store.getModelById(point.parentId)?.flavour,
      after: adapter.store.getModelById(point.afterId!)?.props.text?.toString()
    }
  })
  expect(point).toEqual({ parent: 'monolith:column', after: 'Column 1' })
})

test('reduced motion keeps block drag functional without wobble', async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const grip = await page
    .locator('affine-paragraph > .monolith-document-grip')
    .first()
    .boundingBox()
  await page.mouse.move(grip!.x + 10, grip!.y + 10)
  await page.mouse.down()
  await page.mouse.move(grip!.x + 100, grip!.y + 80, { steps: 8 })
  await expect(page.locator('.monolith-block-drag-preview')).toBeVisible()
  expect(
    await page
      .locator('.monolith-block-drag-preview')
      .evaluate(node => (node as HTMLElement).style.transform)
  ).toContain('rotate(0deg)')
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.locator('.monolith-block-drag-preview')).toBeHidden()
})

test('dragging a database preserves its painted size and inputs without mounting another editor', async ({
  page
}) => {
  const block = page.locator('monolith-application-block').first()
  const before = await block.boundingBox()
  const state = await page.evaluate(() =>
    JSON.stringify(window.monolithHarness!.snapshot().blocks)
  )
  const grip = await block
    .locator(':scope > .monolith-document-grip')
    .boundingBox()
  await page.mouse.move(grip!.x + 8, grip!.y + 8)
  await page.mouse.down()
  await page.mouse.move(grip!.x + 90, grip!.y + 60, { steps: 10 })
  const preview = page.locator('.monolith-block-drag-preview')
  await expect(preview).toBeVisible()
  const size = await preview
    .locator(':scope > *')
    .first()
    .evaluate(node => ({
      width: (node as HTMLElement).offsetWidth,
      height: (node as HTMLElement).offsetHeight
    }))
  expect(Math.abs(size.width - before!.width)).toBeLessThan(2)
  expect(Math.abs(size.height - before!.height)).toBeLessThan(2)
  await expect(preview.locator('input').first()).toHaveValue('Launch review')
  await expect(
    preview.locator('editor-host,monolith-application-block')
  ).toHaveCount(0)
  await expect(page.locator('editor-host')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(preview).toBeHidden()
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.monolithHarness!.snapshot().blocks)
    )
  ).toBe(state)
})

test('embeds own their inputs and snapshot round-trip retains references', async ({
  page
}) => {
  await page
    .getByRole('textbox', { name: 'Task name' })
    .first()
    .fill('Updated inline')
  await expect(
    page.getByRole('textbox', { name: 'Task name' }).first()
  ).toHaveValue('Updated inline')
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Round-trip snapshot' }).click()
  await expect(page.getByTestId('snapshot')).toContainText('"equivalent": true')
  await expect(page.getByTestId('snapshot')).toContainText('shared-base')
})

test('gutter ranges and modifier toggles are independent of native text selection', async ({
  page
}) => {
  const gutters = page.locator('affine-paragraph > .monolith-document-gutter')
  const start = await gutters.nth(0).boundingBox()
  const end = await gutters.nth(2).boundingBox()
  await page.mouse.move(start!.x + 10, start!.y + 8)
  await page.mouse.down()
  await page.mouse.move(end!.x + 10, end!.y + 8, { steps: 10 })
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(3)
  await page.mouse.up()
  await page
    .locator('affine-paragraph > .monolith-document-grip')
    .nth(1)
    .click({ force: true, modifiers: ['Control'] })
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(2)
  await page.keyboard.press('Escape')
  const first = await page.locator('affine-paragraph').nth(0).boundingBox()
  const second = await page.locator('affine-paragraph').nth(1).boundingBox()
  await page.mouse.move(first!.x + 3, first!.y + 12)
  await page.mouse.down()
  await page.mouse.move(second!.x + 120, second!.y + 12, { steps: 12 })
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toContain('First paragraph')
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toContain('Second')
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(0)
})

test('nested list duplication, clipboard, delete and undo preserve the subtree', async ({
  page
}) => {
  await page
    .locator('affine-list')
    .filter({ hasText: 'Parent list' })
    .locator(':scope > .monolith-document-grip')
    .click({ force: true })
  await page.keyboard.press('Control+d')
  await expect(page.locator('affine-list')).toHaveCount(4)
  await page.keyboard.press('Control+z')
  await expect(page.locator('affine-list')).toHaveCount(2)
  await page
    .locator('affine-list')
    .filter({ hasText: 'Parent list' })
    .locator(':scope > .monolith-document-grip')
    .click({ force: true })
  const clipboard = await page.evaluate(() => {
    const data = new DataTransfer()
    document.querySelector('editor-host')!.dispatchEvent(
      new ClipboardEvent('copy', {
        bubbles: true,
        cancelable: true,
        clipboardData: data
      })
    )
    return data.getData('application/x-monolith-blocks+json')
  })
  expect(clipboard).toContain('Nested list')
  await page.evaluate(raw => {
    const data = new DataTransfer()
    data.setData('application/x-monolith-blocks+json', raw)
    document.querySelector('editor-host')!.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data
      })
    )
  }, clipboard)
  await expect(page.locator('affine-list')).toHaveCount(4)
  await page.keyboard.press('Delete')
  await expect(page.locator('affine-list')).toHaveCount(2)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('affine-list')).toHaveCount(4)
})

test('cross-column range selection, layout constraints and narrow stacking', async ({
  page
}) => {
  const grips = page.locator('monolith-column .monolith-document-grip')
  await grips.nth(0).click({ force: true })
  await grips.nth(1).click({ force: true, modifiers: ['Shift'] })
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(2)
  const allowed = await page.evaluate(() => {
    const adapter = window.monolithHarness!
    const parent = adapter
      .orderedBlocks()
      .find(model => model.flavour === 'affine:list')!
    const columns = adapter
      .orderedBlocks()
      .find(model => model.flavour === 'monolith:columns')!
    return {
      descendant: adapter.canMove([parent.id], parent.children[0].id),
      nestedColumns: adapter.canMove([columns.id], columns.children[0].id)
    }
  })
  expect(allowed).toEqual({ descendant: false, nestedColumns: false })
  await page.setViewportSize({ width: 620, height: 900 })
  const columns = page.locator('monolith-column')
  await expect
    .poll(async () => {
      const a = await columns.nth(0).boundingBox(),
        b = await columns.nth(1).boundingBox()
      return b!.y >= a!.y + a!.height
    })
    .toBe(true)
})

test('embed duplication retains the database reference and deletion only removes its block', async ({
  page
}) => {
  await page
    .locator('monolith-application-block > .monolith-document-grip')
    .first()
    .click({ force: true })
  await page.keyboard.press('Control+d')
  await expect(page.locator('monolith-application-block')).toHaveCount(4)
  await expect(page.getByRole('textbox', { name: 'Task name' })).toHaveCount(4)
  const references = await page.evaluate(() =>
    window
      .monolithHarness!.orderedBlocks()
      .filter(model => model.flavour === 'monolith:linked-database')
      .map(model => model.props.baseId)
  )
  expect(references).toEqual([
    'shared-base',
    'shared-base',
    'shared-base',
    'shared-base'
  ])
  await page.keyboard.press('Delete')
  await expect(page.locator('monolith-application-block')).toHaveCount(3)
  await expect(
    page.getByRole('textbox', { name: 'Task name' }).first()
  ).toHaveValue('Launch review')
})

test('read-only denies all page mutations', async ({ page }) => {
  await page
    .locator('affine-paragraph > .monolith-document-grip')
    .first()
    .click({ force: true })
  const before = await page.evaluate(() =>
    JSON.stringify(window.monolithHarness!.snapshot().blocks)
  )
  await page.getByRole('button', { name: 'Toggle read-only' }).click()
  await page.locator('editor-host').focus()
  for (const key of [
    'Control+d',
    'Delete',
    'Control+Alt+ArrowDown',
    'Control+z'
  ])
    await page.keyboard.press(key)
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.monolithHarness!.snapshot().blocks)
    )
  ).toBe(before)
})

test('500 blocks and three embeds retain one host and scroll during a group drag', async ({
  page
}) => {
  await page.goto('/?large')
  await expect(page.locator('affine-paragraph')).toHaveCount(505)
  await expect(page.locator('monolith-application-block')).toHaveCount(3)
  const host = await page.locator('editor-host').elementHandle()
  const grips = page.locator('affine-paragraph > .monolith-document-grip')
  await grips.nth(0).click({ force: true })
  await grips.nth(1).click({ force: true, modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Rerender shell' }).click()
  expect(
    await host!.evaluate(node => node === document.querySelector('editor-host'))
  ).toBe(true)
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(2)
  const box = await grips.first().boundingBox()
  await page.mouse.move(box!.x + 10, box!.y + 10)
  await page.mouse.down()
  await page.mouse.move(box!.x + 80, 990, { steps: 20 })
  await expect
    .poll(() => page.evaluate(() => document.scrollingElement!.scrollTop))
    .toBeGreaterThan(100)
  await page.mouse.up()
  await expect(page.locator('[data-monolith-selected="true"]')).toHaveCount(2)
  expect(
    await host!.evaluate(node => node === document.querySelector('editor-host'))
  ).toBe(true)
})
