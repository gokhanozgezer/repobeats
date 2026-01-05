import { defineConfig } from 'tsup'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: true,
  banner: {
    js: '#!/usr/bin/env node'
  },
  noExternal: [
    '@repobeats/server',
    '@repobeats/shared'
  ],
  onSuccess: async () => {
    const uiDistSrc = join(__dirname, '..', 'ui', 'dist')
    const uiDistDest = join(__dirname, 'dist', 'ui')

    if (existsSync(uiDistSrc)) {
      if (!existsSync(uiDistDest)) {
        mkdirSync(uiDistDest, { recursive: true })
      }
      cpSync(uiDistSrc, uiDistDest, { recursive: true })
      console.log('UI dist copied to CLI bundle')
    } else {
      console.warn('Warning: UI dist not found. Run pnpm build:ui first.')
    }
  }
})
