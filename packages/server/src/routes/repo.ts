import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { GitService } from '../services/gitService.js'
import { CacheService } from '../services/cacheService.js'
import { isRepoBeatsError, DEFAULT_MAX_COMMITS, MAX_COMMITS_LIMIT } from '@repobeats/shared'

const CommitsRequestSchema = z.object({
  since: z.string().optional(),
  until: z.string().optional(),
  maxCommits: z.number().int().min(1).max(MAX_COMMITS_LIMIT).default(DEFAULT_MAX_COMMITS),
  includeStats: z.boolean().default(false)
})

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
      const parseResult = CommitsRequestSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: parseResult.error.flatten()
        })
        return
      }

      const { since, until, maxCommits, includeStats } = parseResult.data

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
