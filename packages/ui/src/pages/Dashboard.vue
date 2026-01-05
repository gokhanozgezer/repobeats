<script setup lang="ts">
import { computed } from 'vue'
import { useRepoStore } from '@/stores/repo'
import { formatDate } from '@repobeats/shared'
import CommitList from '@/components/CommitList.vue'
import TimelineHeatmap from '@/components/TimelineHeatmap.vue'

const repoStore = useRepoStore()

const dateRange = computed(() => {
  if (!repoStore.summary?.stats.dateRange) return ''
  const { earliest, latest } = repoStore.summary.stats.dateRange
  return `${formatDate(earliest)} - ${formatDate(latest)}`
})

const topAuthors = computed(() => {
  return repoStore.summary?.stats.authors.slice(0, 5) ?? []
})
</script>

<template>
  <div class="dashboard">
    <template v-if="repoStore.summary">
      <section class="hero">
        <h1 class="repo-name">{{ repoStore.summary.name }}</h1>
        <p class="repo-meta">
          <span class="branch">{{ repoStore.summary.branch }}</span>
          <span class="sep">·</span>
          <span class="head">{{ repoStore.summary.head.slice(0, 7) }}</span>
        </p>
      </section>

      <section class="stats-grid">
        <div class="card stat-card">
          <div class="stat-value">{{ repoStore.summary.stats.totalCommits }}</div>
          <div class="stat-label">Total Commits</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value additions">{{ repoStore.summary.stats.totalAdditions > 0 ? '+' : '' }}{{ repoStore.summary.stats.totalAdditions.toLocaleString() }}</div>
          <div class="stat-label">Lines Added</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value deletions">{{ repoStore.summary.stats.totalDeletions > 0 ? '-' : '' }}{{ repoStore.summary.stats.totalDeletions.toLocaleString() }}</div>
          <div class="stat-label">Lines Deleted</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">{{ repoStore.summary.stats.authors.length }}</div>
          <div class="stat-label">Contributors</div>
        </div>
      </section>

      <div class="two-col">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Activity Timeline</h2>
            <span class="date-range">{{ dateRange }}</span>
          </div>
          <TimelineHeatmap :commits="repoStore.commits" />
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Top Contributors</h2>
          </div>
          <div class="authors-list">
            <div
              v-for="author in topAuthors"
              :key="author.name"
              class="author-item"
            >
              <div class="author-info">
                <span class="author-name">{{ author.name }}</span>
                <span class="author-commits">{{ author.commitCount }} commits</span>
              </div>
              <div class="author-bar">
                <div
                  class="author-bar-fill"
                  :style="{ width: `${(author.commitCount / repoStore.summary!.stats.totalCommits) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-header">
          <h2 class="card-title">Recent Commits</h2>
          <span class="commit-count">{{ repoStore.commitCount }} loaded</span>
        </div>
        <CommitList :commits="repoStore.commits.slice(0, 20)" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  text-align: center;
  padding: 32px 0;
}

.repo-name {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.repo-meta {
  color: var(--text-secondary);
  font-size: 14px;
}

.branch {
  background: var(--bg-tertiary);
  padding: 4px 10px;
  border-radius: 12px;
}

.sep {
  margin: 0 8px;
}

.head {
  font-family: monospace;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  text-align: center;
  padding: 24px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
}

.stat-value.additions {
  color: var(--success);
}

.stat-value.deletions {
  color: var(--error);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.two-col {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.date-range {
  font-size: 12px;
  color: var(--text-secondary);
}

.authors-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.author-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.author-info {
  display: flex;
  justify-content: space-between;
}

.author-name {
  font-weight: 500;
}

.author-commits {
  font-size: 12px;
  color: var(--text-secondary);
}

.author-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.author-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.commit-count {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .two-col {
    grid-template-columns: 1fr;
  }
}
</style>
