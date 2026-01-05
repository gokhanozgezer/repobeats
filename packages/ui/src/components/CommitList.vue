<script setup lang="ts">
import type { CommitEvent } from '@repobeats/shared'

defineProps<{
  commits: CommitEvent[]
}>()

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str
}
</script>

<template>
  <div class="commit-list">
    <div
      v-for="commit in commits"
      :key="commit.sha"
      class="commit-item"
    >
      <div class="commit-main">
        <span class="commit-sha">{{ commit.sha.slice(0, 7) }}</span>
        <span class="commit-message">{{ truncate(commit.message ?? 'No message', 60) }}</span>
      </div>
      <div class="commit-meta">
        <span class="commit-author">{{ commit.authorName }}</span>
        <span class="commit-date">{{ formatDate(commit.timestamp) }}</span>
        <span v-if="commit.additions !== undefined" class="commit-stats">
          <span class="additions">+{{ commit.additions }}</span>
          <span class="deletions">-{{ commit.deletions }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.commit-list {
  display: flex;
  flex-direction: column;
}

.commit-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.commit-item:last-child {
  border-bottom: none;
}

.commit-main {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.commit-sha {
  font-family: monospace;
  font-size: 12px;
  color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.commit-message {
  font-size: 14px;
  color: var(--text-primary);
}

.commit-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  padding-left: 60px;
}

.commit-stats {
  display: flex;
  gap: 8px;
}

.additions {
  color: var(--success);
}

.deletions {
  color: var(--error);
}
</style>
