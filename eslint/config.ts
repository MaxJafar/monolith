// SPDX-License-Identifier: 0BSD
import js from '@eslint/js'
import type { Linter } from 'eslint'
import imports from 'eslint-plugin-import'
import accessibility from 'eslint-plugin-jsx-a11y'
import naturalSort from 'eslint-plugin-perfectionist'
import react from 'eslint-plugin-react'
import compiler from 'eslint-plugin-react-compiler'
import sonar from 'eslint-plugin-sonarjs'
import unused from 'eslint-plugin-unused-imports'
import globals from 'globals'
import ts from 'typescript-eslint'

import hookSpacing from './padding-react-hooks'

const unusedNames = {
  vars: 'all',
  args: 'after-used',
  varsIgnorePattern: '^_',
  argsIgnorePattern: '^_'
} as const
const separate = (prev: string, next: string) => ({
  blankLine: 'always',
  prev,
  next
})
const together = (prev: string, next: string) => ({
  blankLine: 'any',
  prev,
  next
})
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
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        sourceType: 'module',
        tsconfigRootDir: process.cwd(),
        project: [
          './modules/*/client/tsconfig.json',
          './modules/*/server/tsconfig.json',
          './packages/*/tsconfig.json',
          './apps/*/tsconfig.json',
          './tools/tsconfig.json',
          './tsconfig.eslint.json'
        ]
      }
    }
  },
  js.configs.recommended,
  ...(ts.configs.recommended as Linter.Config[]),
  react.configs.flat.recommended as Linter.Config,
  {
    plugins: { react, 'react-compiler': compiler },
    rules: {
      'react-compiler/react-compiler': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-sort-props': [
        'error',
        {
          callbacksLast: true,
          shorthandFirst: true,
          shorthandLast: false,
          ignoreCase: true,
          noSortAlphabetically: false,
          reservedFirst: true
        }
      ]
    }
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    ...accessibility.flatConfigs.recommended,
    rules: { 'jsx-a11y/no-autofocus': 'off' }
  },
  {
    ...sonar.configs?.recommended,
    rules: { 'sonarjs/prefer-read-only-props': 'off' }
  } as Linter.Config,
  {
    plugins: {
      import: imports,
      'unused-imports': unused,
      local: { rules: { 'padding-react-hooks': hookSpacing } }
    },
    rules: {
      'import/no-duplicates': 'error',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', unusedNames],
      'local/padding-react-hooks': 'error',
      'padding-line-between-statements': [
        'error',
        separate('import', '*'),
        together('import', 'import'),
        separate('*', 'const'),
        separate('const', '*'),
        separate('*', 'function'),
        separate('*', 'class'),
        separate('*', 'export'),
        separate('export', '*'),
        separate('*', 'block-like'),
        separate('*', 'return'),
        together('const', 'const'),
        together('const', 'expression'),
        together('expression', 'const')
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ...unusedNames, ignoreRestSiblings: true }
      ],
      ...Object.fromEntries(
        [
          'no-unnecessary-condition',
          'no-unnecessary-type-arguments',
          'no-unnecessary-type-assertion',
          'no-extra-non-null-assertion'
        ].map(rule => ['@typescript-eslint/' + rule, 'error'])
      )
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  },
  {
    files: ['**/*.stories.tsx', '**/*.stories.ts'],
    plugins: { perfectionist: naturalSort },
    rules: {
      'sort-keys': 'off',
      'perfectionist/sort-objects': [
        'error',
        { type: 'natural', order: 'asc', ignoreCase: true }
      ]
    }
  }
]
export default config
