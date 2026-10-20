import { chromium, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const directory = path.resolve('.temp/federation-harness')
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    const file = path.resolve(
      directory,
      pathname.startsWith('/remote/')
        ? '.' + pathname
        : 'host/' + (pathname === '/' ? 'index.html' : pathname.slice(1))
    )
    if (!file.startsWith(directory + path.sep)) throw Error('Invalid path')
    response.setHeader(
      'Content-Type',
      file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : 'text/html'
    )
    response.end(await readFile(file))
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('[nuqs]'))
      errors.push(message.text())
  })
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await expect(page.getByText('Signed in as Monolith fixture')).toBeVisible()
  await expect(
    page.getByText('Reorder Calendar', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('Host: https://monolith-fixture.invalid')
  ).toBeVisible()
  await expect(
    page.getByText('Authenticated addon request passed')
  ).toBeVisible()
  await expect(page.getByText('Widget action: Shared action')).toBeVisible()
  await page.getByRole('button', { name: 'Filter: all' }).click()
  await expect(
    page.getByRole('button', { name: 'Filter: active' })
  ).toBeVisible()
  await expect(page).toHaveURL(/filter=active/)
  expect(errors).toEqual([])
  console.log(
    'PASS: production desktop federation shares auth, native transport, query, UI, metadata and translations with a separately built addon.'
  )
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
