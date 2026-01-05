<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { useRepoStore } from '@/stores/repo'
import {
  playNotes,
  stopPlayback,
  pausePlayback,
  resumePlayback,
  downloadMidi,
  midiToNoteName
} from '@/lib/audio'
import TransportControls from '@/components/TransportControls.vue'

const mappingStore = useMappingStore()
const repoStore = useRepoStore()

const playing = ref(false)
const paused = ref(false)
const currentNoteIndex = ref(-1)
const progress = ref(0)

const hasRender = computed(() => mappingStore.renderResult !== null)
const currentNote = computed(() => {
  if (currentNoteIndex.value < 0) return null
  return mappingStore.notes[currentNoteIndex.value]
})

const currentCommit = computed(() => {
  if (!currentNote.value) return null
  return repoStore.commits.find(c => c.sha === currentNote.value?.commitSha)
})

async function handlePlay() {
  if (!hasRender.value) {
    await mappingStore.render()
  }

  if (!mappingStore.renderResult) return

  if (paused.value) {
    resumePlayback()
    paused.value = false
    playing.value = true
    return
  }

  playing.value = true
  currentNoteIndex.value = -1
  progress.value = 0

  await playNotes(mappingStore.notes, (index) => {
    currentNoteIndex.value = index
    progress.value = (index / mappingStore.notes.length) * 100
  })

  playing.value = false
  currentNoteIndex.value = -1
}

function handlePause() {
  pausePlayback()
  paused.value = true
  playing.value = false
}

function handleStop() {
  stopPlayback()
  playing.value = false
  paused.value = false
  currentNoteIndex.value = -1
  progress.value = 0
}

function handleDownload() {
  if (!mappingStore.renderResult) return
  const repoName = repoStore.summary?.name ?? 'repobeats'
  downloadMidi(mappingStore.renderResult.midiBase64, `${repoName}.mid`)
}

onUnmounted(() => {
  stopPlayback()
})
</script>

<template>
  <div class="playback-page">
    <section class="header-section">
      <h1>Playback</h1>
      <p class="subtitle">Listen to your repository's musical story</p>
    </section>

    <section class="card player-section">
      <TransportControls
        :playing="playing"
        :paused="paused"
        :progress="progress"
        :disabled="!hasRender && mappingStore.rendering"
        @play="handlePlay"
        @pause="handlePause"
        @stop="handleStop"
      />

      <div class="player-info">
        <div class="info-item">
          <span class="info-label">Duration</span>
          <span class="info-value">{{ Math.round(mappingStore.durationMs / 1000) }}s</span>
        </div>
        <div class="info-item">
          <span class="info-label">Notes</span>
          <span class="info-value">{{ mappingStore.noteCount }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tempo</span>
          <span class="info-value">{{ mappingStore.mapping.tempo.bpm }} BPM</span>
        </div>
      </div>
    </section>

    <section v-if="currentNote" class="card now-playing">
      <h3 class="now-playing-title">Now Playing</h3>
      <div class="note-display">
        <span class="note-name">{{ midiToNoteName(currentNote.pitch) }}</span>
        <span class="note-velocity">vel: {{ currentNote.velocity }}</span>
      </div>
      <div v-if="currentCommit" class="commit-display">
        <span class="commit-sha">{{ currentCommit.sha.slice(0, 7) }}</span>
        <span class="commit-message">{{ currentCommit.message?.slice(0, 60) }}</span>
        <span class="commit-author">{{ currentCommit.authorName }}</span>
      </div>
    </section>

    <section class="card visualization">
      <h3 class="viz-title">Note Timeline</h3>
      <div class="notes-container">
        <div
          v-for="(note, index) in mappingStore.notes.slice(0, 100)"
          :key="index"
          class="note-bar"
          :class="{ active: index === currentNoteIndex, played: index < currentNoteIndex }"
          :style="{
            height: `${(note.pitch - 36) * 2}px`,
            opacity: 0.3 + (note.velocity / 127) * 0.7
          }"
        />
      </div>
      <p v-if="mappingStore.noteCount > 100" class="viz-note">
        Showing first 100 of {{ mappingStore.noteCount }} notes
      </p>
    </section>

    <div class="actions">
      <button
        class="btn btn-secondary"
        @click="handleDownload"
        :disabled="!hasRender"
      >
        Download MIDI
      </button>
    </div>
  </div>
</template>

<style scoped>
.playback-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section {
  text-align: center;
  padding: 16px 0;
}

.header-section h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
}

.player-section {
  padding: 32px;
}

.player-info {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.info-item {
  text-align: center;
}

.info-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-value {
  font-size: 18px;
  font-weight: 600;
}

.now-playing {
  text-align: center;
}

.now-playing-title {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.note-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 16px;
}

.note-name {
  font-size: 48px;
  font-weight: 700;
  color: var(--accent);
}

.note-velocity {
  font-size: 14px;
  color: var(--text-secondary);
}

.commit-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.commit-sha {
  font-family: monospace;
  font-size: 14px;
  color: var(--accent);
}

.commit-message {
  font-size: 14px;
  color: var(--text-primary);
}

.commit-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.visualization {
  padding: 24px;
}

.viz-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.notes-container {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
  overflow: hidden;
}

.note-bar {
  flex: 1;
  min-width: 4px;
  max-width: 12px;
  background: var(--border);
  border-radius: 2px 2px 0 0;
  transition: all 0.1s;
}

.note-bar.active {
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.note-bar.played {
  background: var(--text-secondary);
}

.viz-note {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 12px;
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
