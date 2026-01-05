import type {
  RepoSummary,
  CommitEvent,
  MappingConfig,
  RenderResult
} from '@repobeats/shared'

const API_BASE = '/api/v1'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  async health(): Promise<{ status: string; version: string }> {
    return fetchJSON(`${API_BASE}/health`)
  },

  async getRepoSummary(): Promise<RepoSummary> {
    return fetchJSON(`${API_BASE}/repo/summary`)
  },

  async getCommits(options: {
    since?: string
    until?: string
    maxCommits?: number
    includeStats?: boolean
  } = {}): Promise<CommitEvent[]> {
    return fetchJSON(`${API_BASE}/repo/commits`, {
      method: 'POST',
      body: JSON.stringify(options)
    })
  },

  async renderMidi(
    commits: CommitEvent[],
    mapping: MappingConfig
  ): Promise<RenderResult> {
    return fetchJSON(`${API_BASE}/render/midi`, {
      method: 'POST',
      body: JSON.stringify({ commits, mapping })
    })
  },

  async exportBundle(options: {
    commits: CommitEvent[]
    mapping: MappingConfig
    repoName: string
    anonymize?: boolean
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export/bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }))
      throw new Error(error.error)
    }

    return response.blob()
  }
}
