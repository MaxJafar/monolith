import { defineConfig } from 'astro/config'

export default defineConfig({
  site:
    process.env.SITE_URL ||
    'https://monolith-site-maxjafars-projects.vercel.app',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  markdown: { shikiConfig: { theme: 'github-dark' } }
})
