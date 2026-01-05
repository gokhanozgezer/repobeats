import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RepoSummary, CommitEvent } from '@repobeats/shared'
import { api } from '@/lib/api'

// Session cache - no server calls on refresh within same browser session
const SESSION_CACHE_KEY = 'repobeats_session'

interface SessionCacheData {
  summary: RepoSummary
  commits: CommitEvent[]
}

function getSessionCache(): SessionCacheData | null {
  try {
    const data = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!data) return null
    return JSON.parse(data)
  } catch {
    return null
  }
}

function setSessionCache(summary: RepoSummary, commits: CommitEvent[]) {
  try {
    const cache: SessionCacheData = { summary, commits }
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // sessionStorage might be full or disabled
  }
}

function clearSessionCache() {
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY)
  } catch {
    // ignore
  }
}

export const useRepoStore = defineStore('repo', () => {
  const summary = ref<RepoSummary | null>(null)
  const commits = ref<CommitEvent[]>([])
  const loading = ref(false)
  const loadingMessage = ref('')
  const loadingProgress = ref(0)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const isLoaded = computed(() => summary.value !== null && commits.value.length > 0)
  const commitCount = computed(() => commits.value.length)

  async function loadSummary() {
    loadingMessage.value = 'Connecting to repository...'
    loadingProgress.value = 10

    try {
      summary.value = await api.getRepoSummary()
      loadingProgress.value = 30
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load repository'
    }
  }

  async function loadCommits(options: {
    since?: string
    until?: string
    maxCommits?: number
  } = {}) {
    loadingMessage.value = 'Loading commits...'
    loadingProgress.value = 40

    try {
      // Simulate progress while loading
      const progressInterval = setInterval(() => {
        if (loadingProgress.value < 90) {
          loadingProgress.value += 5
        }
      }, 200)

      commits.value = await api.getCommits({
        ...options,
        includeStats: true
      })

      clearInterval(progressInterval)
      loadingProgress.value = 100
      loadingMessage.value = 'Ready!'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load commits'
    }
  }

  async function initialize() {
    if (initialized.value) return

    // Check session cache first - NO server call on page refresh
    const sessionCache = getSessionCache()
    if (sessionCache) {
      summary.value = sessionCache.summary
      commits.value = sessionCache.commits
      initialized.value = true
      loading.value = false
      return
    }

    // No session cache - need to fetch from server
    loading.value = true
    error.value = null
    loadingProgress.value = 0
    loadingMessage.value = 'Initializing...'

    try {
      loadingMessage.value = 'Connecting to repository...'
      loadingProgress.value = 10

      const currentSummary = await api.getRepoSummary()
      summary.value = currentSummary
      loadingProgress.value = 30

      await loadCommits({ maxCommits: 1000 })

      // Save to session cache for this browser session
      if (summary.value && commits.value.length > 0) {
        setSessionCache(summary.value, commits.value)
      }

      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize'
    } finally {
      loading.value = false
    }
  }

  function refresh() {
    clearSessionCache()
    initialized.value = false
    summary.value = null
    commits.value = []
    initialize()
  }

  return {
    summary,
    commits,
    loading,
    loadingMessage,
    loadingProgress,
    error,
    isLoaded,
    initialized,
    commitCount,
    loadSummary,
    loadCommits,
    initialize,
    refresh
  }
})
