import fs from 'node:fs'
import path from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

/** A source-first addon; no registry account or network request is required. */
export function createAddonHandler(id: string) {
  if (!/^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$/.test(id))
    throw Error('Use an addon id such as yourname--reading-list')

  const directory = path.resolve(ROOT_DIR, 'modules', id)

  if (fs.existsSync(directory))
    throw Error(`An addon already exists at modules/${id}`)

  const slug = id.split('--')[1]!
  const reserved = new Set([
    'calendar',
    'projects',
    'actions',
    'docs',
    'ideas',
    'dashboard',
    'databases',
    'page',
    'search',
    'addons',
    'auth',
    'account-settings',
    'module-manager',
    'todo-list',
    'notes'
  ])
  const installed = fs
    .readdirSync(path.join(ROOT_DIR, 'modules'))
    .map(name => name.split('--').pop())

  if (reserved.has(slug) || installed.includes(slug))
    throw Error('That addon route is already in use. Choose a different name.')

  const title = id
    .split('--')[1]!
    .split('-')
    .map(word => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
  const files: Record<string, string> = {
    'package.json':
      JSON.stringify(
        {
          name: `@monolith/${id}`,
          displayName: title,
          version: '0.1.0',
          type: 'module',
          description: `A customizable ${title} addon for Monolith.`,
          author: id.split('--')[0],
          scripts: {
            build: 'vite build --config client/vite.config.ts',
            typecheck: 'tsc -p client/tsconfig.json'
          },
          monolith: { icon: 'lucide:puzzle', category: 'Community' },
          peerDependencies: {
            '@monolith/ui': 'workspace:*',
            '@monolith/configs': 'workspace:*',
            '@monolith/localization': 'workspace:*',
            react: '^19.2.0'
          }
        },
        null,
        2
      ) + '\n',
    'client/manifest.ts':
      "import { lazy } from 'react'\nimport type { ModuleConfig } from '@monolith/configs'\n\nexport default { routes: { '/': lazy(() => import('./src')) } } satisfies ModuleConfig\n",
    'client/vite.config.ts':
      "import { dirname } from 'node:path'\nimport { fileURLToPath } from 'node:url'\nimport { defineModuleClientConfig } from '@monolith/configs/vite'\nconst directory = dirname(fileURLToPath(import.meta.url))\nexport default defineModuleClientConfig({ dirname: directory }, { root: directory })\n",
    'client/tsconfig.json':
      JSON.stringify(
        {
          extends: '@monolith/configs/tsconfig/module.json',
          compilerOptions: {
            paths: { '@': ['./src/index'], '@/*': ['./src/*'] }
          },
          include: ['./src/**/*', './manifest.ts', './vite.config.ts']
        },
        null,
        2
      ) + '\n',
    'client/src/index.tsx':
      "import { useModuleTranslation } from '@monolith/localization'\nimport { Stack, Text, ModuleHeader } from '@monolith/ui'\n\nexport default function Addon() {\n  const { t } = useModuleTranslation()\n  return <Stack gap=\"lg\"><ModuleHeader /><Text color=\"muted\">{t('welcome')}</Text></Stack>\n}\n",
    'README.md': `# ${title}\n\nA Monolith addon. Edit client/src/index.tsx and all four locale files. Follow packages/ui/DESIGN.md in your Monolith checkout.\n\nFrom the Monolith root:\n\n\`\`\`sh\npnpm install\npnpm --filter @monolith/${id} typecheck\npnpm --filter @monolith/${id} build\n\`\`\`\n\nRestart Monolith, then enable this addon in workspace settings. Share the source in your own Git repository or run \`pnpm monolith addons pack ${id}\` for a portable archive. Choose a license compatible with any source you reuse; this scaffold does not change Monolith's license.\n`
  }
  const welcomes = [
    'Make this space your own. Edit this addon with your preferred coding tools.',
    'Sesuaikan ruang ini menggunakan alat pengekodan pilihan anda.',
    '使用你喜欢的编程工具，自由定制这个扩展。',
    '使用你喜歡的程式工具，自由訂製此擴充套件。'
  ]

  for (const [index, language] of ['en', 'ms', 'zh-CN', 'zh-TW'].entries())
    files[`locales/${language}.json`] =
      JSON.stringify(
        { title, description: `${title} · Monolith`, welcome: welcomes[index] },
        null,
        2
      ) + '\n'

  for (const [name, content] of Object.entries(files)) {
    const file = path.join(directory, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content, { flag: 'wx' })
  }
  console.info(
    `Created modules/${id}. Run pnpm install, build the addon, then enable it in workspace settings. See its README for the complete workflow.`
  )
}
