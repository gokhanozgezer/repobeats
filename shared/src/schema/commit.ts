import { z } from 'zod'

export const CommitEventSchema = z.object({
  sha: z.string().min(7).max(40),
  authorName: z.string().optional(),
  authorEmail: z.string().email().optional(),
  timestamp: z.number().int().positive(),
  message: z.string().optional(),
  filesChanged: z.number().int().nonnegative().optional(),
  additions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional()
})

export type CommitEvent = z.infer<typeof CommitEventSchema>

export const CommitStatsSchema = z.object({
  totalCommits: z.number().int().nonnegative(),
  totalAdditions: z.number().int().nonnegative(),
  totalDeletions: z.number().int().nonnegative(),
  totalFilesChanged: z.number().int().nonnegative(),
  dateRange: z.object({
    earliest: z.number().int().positive(),
    latest: z.number().int().positive()
  }),
  authors: z.array(z.object({
    name: z.string(),
    email: z.string().optional(),
    commitCount: z.number().int().positive()
  }))
})

export type CommitStats = z.infer<typeof CommitStatsSchema>

export const RepoSummarySchema = z.object({
  name: z.string(),
  path: z.string(),
  head: z.string(),
  branch: z.string(),
  stats: CommitStatsSchema
})

export type RepoSummary = z.infer<typeof RepoSummarySchema>
