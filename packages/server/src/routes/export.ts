import { Router, type Request, type Response } from 'express'
import { BundleService } from '../services/bundleService.js'
import { MappingConfigSchema, isRepoBeatsError } from '@repobeats/shared'
import { z } from 'zod'

const ExportRequestSchema = z.object({
  commits: z.array(z.object({
    sha: z.string(),
    timestamp: z.number(),
    authorName: z.string().optional(),
    authorEmail: z.string().optional(),
    message: z.string().optional(),
    filesChanged: z.number().optional(),
    additions: z.number().optional(),
    deletions: z.number().optional()
  })),
  mapping: MappingConfigSchema,
  repoName: z.string(),
  anonymize: z.boolean().optional()
})

export function createExportRouter(): Router {
  const router = Router()
  const bundleService = new BundleService()

  router.post('/bundle', async (req: Request, res: Response) => {
    try {
      const parseResult = ExportRequestSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid export request',
          issues: parseResult.error.issues
        })
        return
      }

      const buffer = await bundleService.create(parseResult.data)

      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${parseResult.data.repoName}-repobeats.zip"`)
      res.send(buffer)
    } catch (error) {
      if (isRepoBeatsError(error)) {
        res.status(error.statusCode).json({ error: error.message, code: error.code })
      } else {
        res.status(500).json({ error: 'Failed to create export bundle' })
      }
    }
  })

  return router
}
