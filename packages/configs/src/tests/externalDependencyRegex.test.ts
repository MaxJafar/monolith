import { describe, expect, it } from 'vitest'

import { externalDependencyRegex } from '../constants/external-dependency-regex'

describe('externalDependencyRegex', () => {
  describe('happy path: bare unscoped packages', () => {
    it.each([
      'react',
      'axios',
      'crypto-js',
      'json-schema-to-ts',
      'socket.io-client',
      'lodash.get',
      'babel-plugin-react-compiler',
      'underscore_pkg',
      'mixed_name-pkg.1'
    ])('matches %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(true)
    })
  })

  describe('happy path: Node built-ins', () => {
    it.each(['node:fs', 'node:fs/promises', 'fs/promises'])(
      'matches %s',
      specifier => {
        expect(externalDependencyRegex.test(specifier)).toBe(true)
      }
    )
  })

  describe('happy path: scoped packages', () => {
    it.each([
      '@monolith/api',
      '@monolith/federation',
      '@monolith/localization',
      '@types/react',
      '@types/node',
      '@module-federation/runtime',
      '@hookform/resolvers',
      '@tanstack/react-query'
    ])('matches %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(true)
    })
  })

  describe('happy path: subpaths', () => {
    it.each([
      'react-dom/client',
      'react-dom/server',
      'zustand/vanilla',
      '@monolith/log/cli',
      '@tanstack/react-query',
      '@scope/pkg/a/b',
      '@scope/pkg-with-hyphen/sub_path'
    ])('matches %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(true)
    })
  })

  describe('rejects relative paths', () => {
    it.each([
      './index',
      './contract',
      './components/Button',
      '../utils/math',
      '../../server',
      '../../../deep/path'
    ])('rejects %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(false)
    })
  })

  describe('rejects POSIX absolute paths', () => {
    it.each(['/repo/src/index.ts', '/a/b/c', '/index'])(
      'rejects %s',
      specifier => {
        expect(externalDependencyRegex.test(specifier)).toBe(false)
      }
    )
  })

  describe('rejects Windows absolute paths', () => {
    it.each([
      'C:\\repo\\src\\index.ts',
      'C:/repo/src/index.ts',
      'D:\\x\\y',
      'd:/foo/bar',
      'C:',
      'C:\\'
    ])('rejects %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(false)
    })
  })

  describe('rejects the entry module id', () => {
    it.each([
      'src/index.ts',
      'src/index.js',
      'src/index.tsx',
      'src/index.jsx',
      'src/index.mjs',
      'src/index.cjs',
      'src/index.mts',
      'src/index.cts',
      'src/main.ts',
      'foo/bar.ts',
      '@scope/pkg/file.js'
    ])('rejects %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(false)
    })
  })

  describe('rejects malformed specifiers', () => {
    it.each([
      '',
      '@monolith',
      '@/foo',
      '@scope/',
      'react/',
      '@scope/pkg/',
      './',
      '../',
      'react dom',
      'react?version=1',
      'react#fragment',
      'http://react',
      'https://react/x',
      'file:///react',
      '~pkg',
      'react\\dom',
      'foo/..',
      'foo/.',
      'foo/../bar',
      '@scope/pkg/./nested',
      '.react',
      '..react',
      '/react',
      '@ scope/pkg',
      '@scope pkg'
    ])('rejects %s', specifier => {
      expect(externalDependencyRegex.test(specifier)).toBe(false)
    })
  })
})
