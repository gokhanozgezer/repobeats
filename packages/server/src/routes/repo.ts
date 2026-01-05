import { Router, type Request, type Response } from 'express'
import { GitService } from '../services/gitService.js'
import { CacheService } from '../services/cacheService.js'
import { isRepoBeatsError } from '@repobeats/shared'

export function createRepoRouter(repoPath: string, useCache: boolean): Router {
  const router = Router()
  const gitService = new GitService(repoPath)
  const cacheService = useCache ? new CacheService() : null

  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await gitService.getSummary()
      res.json(summary)
    } catch (error) {
      if (isRepoBeatsError(error)) {
        res.status(error.statusCode).json({ error: error.message, code: error.code })
      } else {
        res.status(500).json({ error: 'Failed to get repository summary' })
      }
    }
  })

  router.post('/commits', async (req: Request, res: Response) => {
    try {
      const { since, until, maxCommits = 1000, includeStats = false } = req.body

      if (cacheService) {
        const head = await gitService.getHead()
        const cached = cacheService.get(repoPath, head, { since, until, maxCommits })

        if (cached) {
          res.json(cached)
          return
        }

        const commits = await gitService.getCommits({ since, until, maxCommits, includeStats })

        cacheService.set(repoPath, head, { since, until, maxCommits }, commits)

        res.json(commits)
        return
      }

      const commits = await gitService.getCommits({ since, until, maxCommits, includeStats })
      res.json(commits)
    } catch (error) {
      if (isRepoBeatsError(error)) {
        res.status(error.statusCode).json({ error: error.message, code: error.code })
      } else {
        res.status(500).json({ error: 'Failed to get commits' })
      }
    }
  })

  return router
}
