import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: import.meta.dirname,
  server: {
    host: '127.0.0.1',
    port: 5187,
    strictPort: true,
    fs: { allow: [resolve(import.meta.dirname, '../..')] },
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:3636',
        ws: true,
        changeOrigin: true,
        headers: { Origin: 'http://localhost:5173' }
      }
    }
  },
  plugins: [
    {
      name: 'rooms-isolated-fixtures',
      configureServer(server) {
        server.middlewares.use('/fixture', (_request, response) => {
          const fixture = JSON.parse(
            readFileSync(
              resolve(
                import.meta.dirname,
                '../../.temp/rooms-media-fixture.json'
              ),
              'utf8'
            )
          )
          if (fixture.expires < Date.now()) {
            response.statusCode = 410
            response.end('Fixture expired')
            return
          }
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify(fixture))
        })
      }
    }
  ]
})
