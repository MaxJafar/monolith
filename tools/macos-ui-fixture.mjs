import { resolveAddonIdentity } from '@monolith/configs/node'
// Give the existing synthetic widget workspace a unique native-test label.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const widgets = JSON.parse(
  readFileSync('.temp/widgets-webkit-canonical.json', 'utf8')
)
assert.ok(fixture.email.endsWith('@example.invalid'))
const api = 'http://localhost:3636'
const login = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: fixture.email, password: fixture.password })
})
assert.equal(login.status, 200)
const token = (await login.json()).data.accessToken
const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
const endpoint = `${api}/modules/${remote}/workspaces`
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
}
const list = await fetch(`${endpoint}/list`, { headers })
assert.equal(list.status, 200)
const workspace = (await list.json()).data.find(
  item => item.id === widgets.workspace
)
assert.equal(workspace?.owner_id, fixture.owner)
assert.equal(workspace.description, 'Synthetic interaction review')
const { icon, profile, enabled_modules, description } = workspace
const name = 'Mac native acceptance'
const updated = await fetch(`${endpoint}/update?id=${workspace.id}`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ name, icon, profile, enabled_modules, description })
})
assert.ok(updated.ok, await updated.text())
mkdirSync('.temp/macos-ui', { recursive: true })
writeFileSync(
  '.temp/macos-ui/widgets.json',
  JSON.stringify({ ...widgets, name })
)
console.log('Synthetic Mac UI workspace ready.')
