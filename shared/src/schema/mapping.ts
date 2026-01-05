import { z } from 'zod'

export const ScaleType = z.enum(['chromatic', 'major', 'minor', 'pentatonic', 'blues', 'dorian'])
export type ScaleType = z.infer<typeof ScaleType>

export const TempoConfigSchema = z.object({
  mode: z.enum(['fixed', 'frequency']),
  bpm: z.number().int().min(20).max(300).default(120),
  windowDays: z.number().int().min(1).max(365).optional()
})

export type TempoConfig = z.infer<typeof TempoConfigSchema>

export const PitchConfigSchema = z.object({
  source: z.enum(['sha', 'author', 'hour', 'dayOfWeek']),
  scale: ScaleType.default('pentatonic'),
  rootNote: z.number().int().min(0).max(127).default(60),
  octaveMin: z.number().int().min(0).max(8).default(3),
  octaveMax: z.number().int().min(0).max(8).default(6)
})

export type PitchConfig = z.infer<typeof PitchConfigSchema>

export const DurationConfigSchema = z.object({
  source: z.enum(['diff', 'files', 'messageLength', 'fixed']),
  minMs: z.number().int().min(50).max(5000).default(100),
  maxMs: z.number().int().min(100).max(10000).default(1000)
})

export type DurationConfig = z.infer<typeof DurationConfigSchema>

export const VelocityConfigSchema = z.object({
  source: z.enum(['additions', 'deletions', 'files', 'messageLength', 'timeOfDay', 'fixed']),
  min: z.number().int().min(1).max(127).default(40),
  max: z.number().int().min(1).max(127).default(100)
})

export type VelocityConfig = z.infer<typeof VelocityConfigSchema>

export const InstrumentConfigSchema = z.object({
  program: z.number().int().min(0).max(127).default(0),
  channel: z.number().int().min(0).max(15).default(0)
})

export type InstrumentConfig = z.infer<typeof InstrumentConfigSchema>

export const MappingConfigSchema = z.object({
  name: z.string().optional(),
  tempo: TempoConfigSchema,
  pitch: PitchConfigSchema,
  duration: DurationConfigSchema,
  velocity: VelocityConfigSchema,
  instrument: InstrumentConfigSchema.optional()
})

export type MappingConfig = z.infer<typeof MappingConfigSchema>

export const RenderRequestSchema = z.object({
  commits: z.array(z.object({
    sha: z.string(),
    timestamp: z.number(),
    authorName: z.string().optional(),
    message: z.string().optional(),
    filesChanged: z.number().optional(),
    additions: z.number().optional(),
    deletions: z.number().optional()
  })),
  mapping: MappingConfigSchema,
  seed: z.number().optional()
})

export type RenderRequest = z.infer<typeof RenderRequestSchema>

export const NoteEventSchema = z.object({
  pitch: z.number().int().min(0).max(127),
  velocity: z.number().int().min(0).max(127),
  startMs: z.number().nonnegative(),
  durationMs: z.number().positive(),
  commitSha: z.string()
})

export type NoteEvent = z.infer<typeof NoteEventSchema>

export const RenderResultSchema = z.object({
  midiBase64: z.string(),
  notes: z.array(NoteEventSchema),
  durationMs: z.number().positive(),
  noteCount: z.number().int().nonnegative()
})

export type RenderResult = z.infer<typeof RenderResultSchema>
