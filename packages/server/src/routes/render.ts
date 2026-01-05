import { Router, type Request, type Response } from 'express'
import { MidiService } from '../services/midiService.js'
import { RenderRequestSchema, isRepoBeatsError } from '@repobeats/shared'

export function createRenderRouter(): Router {
  const router = Router()
  const midiService = new MidiService()

  router.post('/midi', async (req: Request, res: Response) => {
    try {
      const parseResult = RenderRequestSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid render request',
          issues: parseResult.error.issues
        })
        return
      }

      const { commits, mapping } = parseResult.data
      const result = midiService.render(commits, mapping)

      res.json(result)
    } catch (error) {
      if (isRepoBeatsError(error)) {
        res.status(error.statusCode).json({ error: error.message, code: error.code })
      } else {
        res.status(500).json({ error: 'Failed to render MIDI' })
      }
    }
  })

  return router
}
