import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRepoRouter } from './routes/repo.js'
import { createRenderRouter } from './routes/render.js'
import { createExportRouter } from './routes/export.js'
import { API_VERSION, isRepoBeatsError } from '@repobeats/shared'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface ServerConfig {
  repoPath: string
  port: number
  host: string
  since?: string
  until?: string
  maxCommits: number
  cache: boolean
}

export function createApp(config: ServerConfig): Express {
  const app = express()

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://localhost')) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
  }))

  app.use(express.json({ limit: '10mb' }))

  app.get(`/api/${API_VERSION}/health`, (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: API_VERSION })
  })

  app.use(`/api/${API_VERSION}/repo`, createRepoRouter(config.repoPath, config.cache))
  app.use(`/api/${API_VERSION}/render`, createRenderRouter())
  app.use(`/api/${API_VERSION}/export`, createExportRouter())

  // Try multiple paths for UI dist (dev vs production/npx)
  const possibleUiPaths = [
    join(__dirname, '..', '..', 'ui', 'dist'),  // dev: packages/server -> packages/ui/dist
    join(__dirname, 'ui'),                       // prod: dist/ui (bundled with CLI)
    join(__dirname, '..', 'ui')                  // alt prod path
  ]

  const uiDistPath = possibleUiPaths.find(p => existsSync(p))

  if (uiDistPath) {
    app.use(express.static(uiDistPath))

    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        next()
        return
      }
      res.sendFile(join(uiDistPath, 'index.html'))
    })
  } else {
    app.get('/', (_req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>RepoBeats</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px; }
              h1 { color: #333; }
              code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>RepoBeats Server Running</h1>
            <p>UI not built yet. Run <code>pnpm build:ui</code> to build the UI.</p>
            <p>API available at <code>/api/${API_VERSION}/</code></p>
            <ul>
              <li>GET /api/${API_VERSION}/health</li>
              <li>GET /api/${API_VERSION}/repo/summary</li>
              <li>POST /api/${API_VERSION}/repo/commits</li>
              <li>POST /api/${API_VERSION}/render/midi</li>
              <li>POST /api/${API_VERSION}/export/bundle</li>
            </ul>
          </body>
        </html>
      `)
    })
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err)

    if (isRepoBeatsError(err)) {
      res.status((err as any).statusCode || 500).json({
        error: err.message,
        code: (err as any).code
      })
      return
    }

    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
