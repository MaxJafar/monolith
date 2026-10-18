import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const app = new URL('../', import.meta.url)
const input = new URL('dist/', app)
const output = new URL(`../../.temp/site-publish/${randomUUID()}/`, app)
await mkdir(output, { recursive: true })
// Only built public files enter the publishing folder. No repository, runtime
// data, environment files or dependency tree is uploaded.
await cp(input, output, { recursive: true })
const config = JSON.parse(await readFile(new URL('vercel.json', app), 'utf8'))
const { headers, cleanUrls, trailingSlash } = config
await writeFile(
  new URL('vercel.json', output),
  JSON.stringify(
    {
      headers,
      cleanUrls,
      trailingSlash,
      framework: null,
      buildCommand: null,
      installCommand: null,
      outputDirectory: null
    },
    null,
    2
  )
)
await writeFile(new URL('.vercelignore', output), '.vercel\n')
const files = await readdir(output, { recursive: true })
if (
  files.some((file) =>
    /(?:^|[/\\])(?:\.env(?:\.|$)|node_modules|\.git[/\\]|keys[/\\])/.test(file)
  )
)
  throw new Error('Unexpected private file in publish folder')
console.log(
  `Staged ${files.length} public files/directories at ${fileURLToPath(output)}`
)
await writeFile(
  new URL('../../.temp/site-publish.json', app),
  JSON.stringify({ path: fileURLToPath(output) }, null, 2)
)
