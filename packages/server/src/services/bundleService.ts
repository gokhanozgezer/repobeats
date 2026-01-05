import archiver from 'archiver'
import { Writable } from 'node:stream'
import {
  type CommitEvent,
  type MappingConfig,
  APP_VERSION,
  ExportError,
  anonymizeString
} from '@repobeats/shared'
import { MidiService } from './midiService.js'

export interface BundleOptions {
  commits: CommitEvent[]
  mapping: MappingConfig
  repoName: string
  anonymize?: boolean
}

export class BundleService {
  private midiService: MidiService

  constructor() {
    this.midiService = new MidiService()
  }

  async create(options: BundleOptions): Promise<Buffer> {
    const { commits, mapping, repoName, anonymize = false } = options

    try {
      const processedCommits = anonymize
        ? commits.map(c => ({
            ...c,
            authorName: anonymizeString(c.authorName ?? 'unknown'),
            authorEmail: undefined,
            message: undefined
          }))
        : commits

      const renderResult = this.midiService.render(processedCommits, mapping)
      const midiBuffer = Buffer.from(renderResult.midiBase64, 'base64')

      const metadata = {
        version: APP_VERSION,
        generatedAt: Date.now(),
        repo: {
          name: repoName,
          commitCount: commits.length
        },
        mapping,
        options: {
          anonymize
        },
        stats: {
          durationMs: renderResult.durationMs,
          noteCount: renderResult.noteCount
        }
      }

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []

        const writable = new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(chunk)
            callback()
          }
        })

        const archive = archiver('zip', { zlib: { level: 9 } })

        archive.on('error', (err) => {
          reject(new ExportError(`Archive creation failed: ${err.message}`))
        })

        writable.on('finish', () => {
          resolve(Buffer.concat(chunks))
        })

        archive.pipe(writable)

        archive.append(JSON.stringify(metadata, null, 2), { name: 'repobeats.json' })

        archive.append(JSON.stringify(processedCommits, null, 2), { name: 'commits.json' })

        archive.append(midiBuffer, { name: 'track.mid' })

        archive.append(
          `RepoBeats Export
================

Generated: ${new Date().toISOString()}
Repository: ${repoName}
Commits: ${commits.length}
Duration: ${Math.round(renderResult.durationMs / 1000)}s

Files:
- repobeats.json : Metadata and mapping configuration
- commits.json   : Commit data used for generation
- track.mid      : Generated MIDI file

Open track.mid with any MIDI player or DAW.
`,
          { name: 'README.txt' }
        )

        archive.finalize()
      })
    } catch (error) {
      if (error instanceof ExportError) throw error
      throw new ExportError(String(error))
    }
  }
}
