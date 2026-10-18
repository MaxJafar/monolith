import js from '@eslint/js'
import type { Linter } from 'eslint'
import globals from 'globals'
import process from 'node:process'
import tseslint from 'typescript-eslint'

import {
  importsConfig,
  reactConfig,
  sonarConfig,
  storiesConfig,
  styleConfig,
  testsConfig
} from '.'

const config: Linter.Config[] = [
  {
    ignores: [
      '**/*.config.ts',
      '**/*.config.js',
      '**/dist/',
      '**/tsbuild/**',
      '**/dist-docker/**',
      'dist/',
      '.temp/**',
      'reference/**',
      '.opencode/**',
      'tools/src/templates/**',
      '**/storybook-static/',
      'modules/example-author--truckers-log/client/src/lib/'
    ]
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      sourceType: 'module',
      parserOptions: {
        project: [
          './modules/*/client/tsconfig.json',
          './modules/*/server/tsconfig.json',
          './packages/*/tsconfig.json',
          './apps/*/tsconfig.json',
          './tools/tsconfig.json',
          './tsconfig.eslint.json'
        ],
        tsconfigRootDir: process.cwd(),
        sourceType: 'module'
      }
    }
  },

  // JS/TS Presets
  js.configs.recommended,
  ...(tseslint.configs.recommended as Linter.Config[]),

  // Feature / Plugin Configs
  ...reactConfig,
  ...sonarConfig,
  ...importsConfig,
  ...styleConfig,
  ...testsConfig,
  ...storiesConfig
]

export default config
