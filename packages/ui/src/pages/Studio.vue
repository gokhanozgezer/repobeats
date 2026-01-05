<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { useRepoStore } from '@/stores/repo'
import { useSettingsStore } from '@/stores/settings'
import { PRESETS, type PresetName } from '@repobeats/shared'
import {
  playNotes,
  stopPlayback,
  pausePlayback,
  midiToNoteName,
  getNoteColor,
  downloadMidi,
  exportToWav,
  type PlaybackSettings
} from '@/lib/audio'
import { api } from '@/lib/api'

const mappingStore = useMappingStore()
const repoStore = useRepoStore()
const settingsStore = useSettingsStore()

// Playback state
const playing = ref(false)
const paused = ref(false)
const currentNoteIndex = ref(-1)
const progress = ref(0)

// Export modal state
const showExportModal = ref(false)
const anonymize = ref(false)
const exportingZip = ref(false)
const exportingWav = ref(false)
const exportError = ref<string | null>(null)

function generateFilename(extension: string): string {
  const repoName = repoStore.summary?.name ?? 'project'
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `repobeats_${repoName}_${year}${month}${day}_${hours}${minutes}.${extension}`
}

async function handleExportMidi() {
  if (!mappingStore.renderResult) {
    await mappingStore.render()
  }
  if (mappingStore.renderResult) {
    downloadMidi(mappingStore.renderResult.midiBase64, generateFilename('mid'))
  }
}

async function handleExportWav() {
  if (!hasRender.value) {
    await mappingStore.render()
  }
  if (mappingStore.notes.length === 0) return

  exportingWav.value = true
  exportError.value = null

  try {
    await exportToWav(
      mappingStore.notes,
      generateFilename('wav'),
      undefined,
      settingsStore.currentSettings
    )
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'WAV export failed'
  } finally {
    exportingWav.value = false
  }
}

async function handleExportBundle() {
  if (!repoStore.summary) return

  exportingZip.value = true
  exportError.value = null

  try {
    const blob = await api.exportBundle({
      commits: repoStore.commits,
      mapping: mappingStore.mapping,
      repoName: repoStore.summary.name,
      anonymize: anonymize.value
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generateFilename('zip')
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Export failed'
  } finally {
    exportingZip.value = false
  }
}

function handleExportJson() {
  const data = {
    commits: anonymize.value
      ? repoStore.commits.map(c => ({
          ...c,
          authorName: `anon_${c.sha.slice(0, 8)}`,
          authorEmail: undefined,
          message: undefined
        }))
      : repoStore.commits,
    mapping: mappingStore.mapping
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = generateFilename('json')
  a.click()
  URL.revokeObjectURL(url)
}

function openExportModal() {
  showExportModal.value = true
}

function closeExportModal() {
  showExportModal.value = false
}

const scaleOptions = [
  { value: 'pentatonic', label: 'Pentatonic' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' }
]

const currentSettings = computed<PlaybackSettings>(() => ({
  tempo: settingsStore.tempo,
  instruments: { ...settingsStore.instruments }
}))

// Timeline state
const timelineRef = ref<HTMLElement | null>(null)
const hoveredNoteIndex = ref(-1)
const tooltipPosition = ref({ x: 0, y: 0 })

// Progress bar hover state
const progressHovered = ref(false)
const progressHoverPercent = ref(0)
const progressTooltipX = ref(0)
const progressTooltipY = ref(0)

// Scroll pause/resume state
const wasPlayingBeforeScroll = ref(false)
const scrollTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const isScrolling = ref(false)
const isProgrammaticScroll = ref(false)

// Computed
const hasRender = computed(() => mappingStore.renderResult !== null)
const hasAnyInstrument = computed(() => {
  const inst = settingsStore.instruments
  return inst.guitar || inst.piano || inst.drums || inst.strings
})
const currentNote = computed(() => {
  if (currentNoteIndex.value < 0) return null
  return mappingStore.notes[currentNoteIndex.value]
})

const currentCommit = computed(() => {
  if (!currentNote.value) return null
  return repoStore.commits.find(c => c.sha === currentNote.value?.commitSha)
})

const hoveredNote = computed(() => {
  if (hoveredNoteIndex.value < 0) return null
  return mappingStore.notes[hoveredNoteIndex.value]
})

const presetOptions = computed(() => [
  ...Object.entries(PRESETS).map(([key, preset]) => ({
    value: key as PresetName,
    label: preset.name ?? key
  })),
  { value: 'custom' as const, label: 'Custom' }
])

// Auto-render on mount
onMounted(async () => {
  if (repoStore.isLoaded && !hasRender.value) {
    await mappingStore.render()
  }
})

// Re-render when commits change
watch(() => repoStore.commits.length, async (newLen, oldLen) => {
  if (newLen > 0 && newLen !== oldLen) {
    await mappingStore.render()
  }
})

// Playback handlers
async function handlePlay() {
  if (!hasRender.value) {
    await mappingStore.render()
  }

  if (!mappingStore.renderResult) return

  // Start from current position if set, otherwise from beginning
  const startIndex = currentNoteIndex.value >= 0 ? currentNoteIndex.value : 0
  paused.value = false
  startPlayingFromIndex(startIndex)
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

  // Clear scroll state
  isScrolling.value = false
  wasPlayingBeforeScroll.value = false
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
    scrollTimeout.value = null
  }

  // Reset timeline scroll to beginning
  if (timelineRef.value) {
    isProgrammaticScroll.value = true
    timelineRef.value.scrollLeft = 0
    setTimeout(() => {
      isProgrammaticScroll.value = false
    }, 100)
  }
}

function handleSeek(index: number) {
  if (!hasRender.value || mappingStore.notes.length === 0) return
  if (index < 0 || index >= mappingStore.notes.length) return

  // Stop any scroll-related state
  isScrolling.value = false
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
    scrollTimeout.value = null
  }
  wasPlayingBeforeScroll.value = false

  // Update position
  currentNoteIndex.value = index
  progress.value = mappingStore.notes.length > 1
    ? (index / (mappingStore.notes.length - 1)) * 100
    : 0

  // Scroll timeline to this position (programmatic)
  isProgrammaticScroll.value = true
  if (timelineRef.value) {
    const noteWidth = 8
    const totalWidth = mappingStore.notes.length * noteWidth
    const maxScroll = Math.max(0, totalWidth - timelineRef.value.clientWidth)

    if (maxScroll > 0 && mappingStore.notes.length > 1) {
      const scrollPercent = index / (mappingStore.notes.length - 1)
      timelineRef.value.scrollLeft = scrollPercent * maxScroll
    }
  }
  setTimeout(() => {
    isProgrammaticScroll.value = false
  }, 50)

  // Enable stop button
  if (!playing.value) {
    paused.value = true
  }

  // If playing, restart from new position
  if (playing.value) {
    stopPlayback()
    startPlayingFromIndex(index)
  }
}

function startPlayingFromIndex(index: number) {
  const note = mappingStore.notes[index]
  if (!note) return

  // Clear any scroll state
  isScrolling.value = false
  wasPlayingBeforeScroll.value = false

  playing.value = true
  paused.value = false

  const notesFromHere = mappingStore.notes.slice(index)
  const offsetMs = note.startMs

  playNotes(
    notesFromHere.map(n => ({ ...n, startMs: n.startMs - offsetMs })),
    (i) => {
      currentNoteIndex.value = index + i
      progress.value = mappingStore.notes.length > 1
        ? ((index + i) / (mappingStore.notes.length - 1)) * 100
        : 0
      scrollToCurrentNote()
    },
    () => {
      playing.value = false
      paused.value = false
      currentNoteIndex.value = -1
      progress.value = 100
    },
    currentSettings.value
  )
}

function scrollToCurrentNote() {
  if (!timelineRef.value || currentNoteIndex.value < 0) return
  // Don't fight with user's manual scroll
  if (isScrolling.value) return

  isProgrammaticScroll.value = true

  const noteWidth = 8
  const totalWidth = mappingStore.notes.length * noteWidth
  const maxScroll = Math.max(0, totalWidth - timelineRef.value.clientWidth)

  if (maxScroll > 0 && mappingStore.notes.length > 1) {
    const scrollPercent = currentNoteIndex.value / (mappingStore.notes.length - 1)
    timelineRef.value.scrollLeft = scrollPercent * maxScroll
  }

  requestAnimationFrame(() => {
    isProgrammaticScroll.value = false
  })
}

function handleProgressClick(event: MouseEvent) {
  if (!hasRender.value || mappingStore.notes.length === 0) return

  const bar = event.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percent = (clickX / rect.width) * 100
  const targetIndex = Math.floor((percent / 100) * mappingStore.notes.length)

  handleSeek(Math.max(0, Math.min(targetIndex, mappingStore.notes.length - 1)))
}

function handleProgressMouseMove(event: MouseEvent) {
  const bar = event.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  progressHoverPercent.value = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)))
  progressTooltipX.value = event.clientX
  progressTooltipY.value = rect.top
  progressHovered.value = true
}

function handleProgressMouseLeave() {
  progressHovered.value = false
}

function handleNoteHover(index: number, event: MouseEvent) {
  hoveredNoteIndex.value = index
  tooltipPosition.value = {
    x: event.clientX,
    y: event.clientY - 60
  }
}

function handleNoteLeave() {
  hoveredNoteIndex.value = -1
}

function handleTimelineScroll(event: Event) {
  // Ignore programmatic scrolls (but with safety timeout)
  if (isProgrammaticScroll.value) {
    // Safety: reset flag after 200ms in case it gets stuck
    setTimeout(() => { isProgrammaticScroll.value = false }, 200)
    return
  }
  if (!hasRender.value || mappingStore.notes.length === 0) return

  const target = event.target as HTMLElement
  const scrollLeft = target.scrollLeft
  const noteWidth = 8
  const totalWidth = mappingStore.notes.length * noteWidth
  const maxScroll = Math.max(0, totalWidth - target.clientWidth)

  // Calculate note index from scroll position
  let noteIndex = 0
  if (maxScroll > 0 && mappingStore.notes.length > 1) {
    const scrollPercent = scrollLeft / maxScroll
    noteIndex = Math.round(scrollPercent * (mappingStore.notes.length - 1))
  }
  const clampedIndex = Math.max(0, Math.min(noteIndex, mappingStore.notes.length - 1))

  // First scroll event - if playing or paused, stop playback
  if (!isScrolling.value) {
    if (playing.value) {
      wasPlayingBeforeScroll.value = true
      stopPlayback()
      playing.value = false
    } else if (paused.value) {
      // Clear paused state - user is selecting new position
      stopPlayback()
      paused.value = false
    }
  }

  isScrolling.value = true

  // Update UI
  currentNoteIndex.value = clampedIndex
  progress.value = mappingStore.notes.length > 1
    ? (clampedIndex / (mappingStore.notes.length - 1)) * 100
    : 0

  // Enable stop button
  paused.value = true

  // Debounce scroll end detection
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }

  scrollTimeout.value = setTimeout(() => {
    isScrolling.value = false

    // Resume playback if was playing before scroll
    if (wasPlayingBeforeScroll.value) {
      wasPlayingBeforeScroll.value = false
      startPlayingFromIndex(clampedIndex)
    }
  }, 200)
}

function handlePresetChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value
  settingsStore.setPreset(value)

  if (value !== 'custom') {
    mappingStore.setPreset(value as PresetName)
    mappingStore.render()
  }
}

async function applyCustomSettings() {
  // Update mapping with all custom settings
  mappingStore.updateTempo({ bpm: settingsStore.tempo })
  mappingStore.updatePitch({
    scale: settingsStore.scale,
    octaveMin: settingsStore.octaveMin,
    octaveMax: settingsStore.octaveMax
  })
  // Re-render with new settings
  await mappingStore.render()
}

onUnmounted(() => {
  stopPlayback()
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
})
</script>

<template>
  <div class="studio">
    <!-- Header -->
    <section class="header-section">
      <h1>Studio</h1>
      <p class="subtitle">Mix and master your repository's sound</p>
    </section>

    <!-- Loading State -->
    <div v-if="mappingStore.rendering" class="rendering-overlay">
      <div class="rendering-content">
        <div class="spinner"></div>
        <p>Rendering {{ repoStore.commitCount }} commits...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="studio-grid">
      <!-- Left Panel: Controls -->
      <aside class="card controls-panel">
        <div class="panel-section">
          <h3 class="panel-title">Preset</h3>
          <select
            :value="settingsStore.selectedPreset"
            @change="handlePresetChange"
            class="preset-select"
          >
            <option v-for="preset in presetOptions" :key="preset.value" :value="preset.value">
              {{ preset.label }}
            </option>
          </select>
        </div>

        <div class="panel-section">
          <h3 class="panel-title">Settings</h3>

          <!-- Custom Mode Controls -->
          <template v-if="settingsStore.isCustomMode">
            <div class="setting-row editable">
              <span class="setting-label">Tempo</span>
              <div class="setting-input">
                <input
                  type="range"
                  :value="settingsStore.tempo"
                  @input="settingsStore.setTempo(Number(($event.target as HTMLInputElement).value))"
                  min="40"
                  max="200"
                  step="5"
                />
                <span class="setting-value">{{ settingsStore.tempo }} BPM</span>
              </div>
            </div>

            <div class="setting-row editable">
              <span class="setting-label">Scale</span>
              <select
                :value="settingsStore.scale"
                @change="settingsStore.setScale(($event.target as HTMLSelectElement).value as any)"
                class="custom-select"
              >
                <option v-for="opt in scaleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="setting-row editable">
              <span class="setting-label">Octave Range</span>
              <div class="octave-inputs">
                <input
                  type="number"
                  :value="settingsStore.octaveMin"
                  @input="settingsStore.setOctaveRange(Number(($event.target as HTMLInputElement).value), settingsStore.octaveMax)"
                  min="1"
                  max="7"
                  class="octave-input"
                />
                <span class="octave-separator">-</span>
                <input
                  type="number"
                  :value="settingsStore.octaveMax"
                  @input="settingsStore.setOctaveRange(settingsStore.octaveMin, Number(($event.target as HTMLInputElement).value))"
                  min="1"
                  max="8"
                  class="octave-input"
                />
              </div>
            </div>

            <div class="setting-row">
              <span class="setting-label">Playback Instruments</span>
            </div>

            <div class="instrument-toggles">
              <label class="toggle-item">
                <input type="checkbox" :checked="settingsStore.instruments.guitar" @change="settingsStore.setInstrument('guitar', ($event.target as HTMLInputElement).checked)" />
                <span class="toggle-label">Guitar</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" :checked="settingsStore.instruments.piano" @change="settingsStore.setInstrument('piano', ($event.target as HTMLInputElement).checked)" />
                <span class="toggle-label">Piano</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" :checked="settingsStore.instruments.drums" @change="settingsStore.setInstrument('drums', ($event.target as HTMLInputElement).checked)" />
                <span class="toggle-label">Drums</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" :checked="settingsStore.instruments.strings" @change="settingsStore.setInstrument('strings', ($event.target as HTMLInputElement).checked)" />
                <span class="toggle-label">Strings</span>
              </label>
            </div>

            <button
              class="btn btn-primary apply-btn"
              @click="applyCustomSettings"
              :disabled="mappingStore.rendering"
            >
              {{ mappingStore.rendering ? 'Generating...' : 'Generate Timeline' }}
            </button>
          </template>

          <!-- Preset Mode Display -->
          <template v-else>
            <div class="setting-row">
              <span class="setting-label">Tempo</span>
              <span class="setting-value">{{ mappingStore.mapping.tempo.bpm }} BPM</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Scale</span>
              <span class="setting-value">{{ mappingStore.mapping.pitch.scale }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Octave Range</span>
              <span class="setting-value">{{ mappingStore.mapping.pitch.octaveMin }}-{{ mappingStore.mapping.pitch.octaveMax }}</span>
            </div>
          </template>
        </div>

        <div class="panel-section stats">
          <div class="stat-item">
            <span class="stat-value">{{ mappingStore.noteCount || '-' }}</span>
            <span class="stat-label">Notes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ mappingStore.durationMs ? Math.round(mappingStore.durationMs / 1000) + 's' : '-' }}</span>
            <span class="stat-label">Duration</span>
          </div>
        </div>
      </aside>

      <!-- Center Panel: Timeline & Player -->
      <main class="main-panel">
        <!-- No Instrument Warning -->
        <div v-if="settingsStore.isCustomMode && !hasAnyInstrument" class="no-instrument-warning">
          <div class="warning-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
          <h3>No Instrument Selected</h3>
          <p>Please select at least one instrument from the settings panel to generate audio.</p>
        </div>

        <!-- Main Content (when instruments selected) -->
        <template v-else>
        <!-- Transport Controls -->
        <div class="card transport-section">
          <div class="transport-controls">
            <button
              class="transport-btn stop-btn"
              @click="handleStop"
              :disabled="!playing && !paused"
              title="Stop"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>

            <button
              v-if="!playing"
              class="transport-btn play-btn"
              @click="handlePlay"
              :disabled="mappingStore.rendering"
              title="Play"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <button
              v-else
              class="transport-btn pause-btn"
              @click="handlePause"
              title="Pause"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>

            <button
              class="transport-btn export-btn"
              @click="openExportModal"
              title="Export"
              :disabled="!hasRender"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="progress-container">
            <div
              class="progress-bar"
              @click="handleProgressClick"
              @mousemove="handleProgressMouseMove"
              @mouseleave="handleProgressMouseLeave"
            >
              <div class="progress-fill" :style="{ width: `${progress}%` }" />
              <!-- Hover indicator -->
              <div
                v-if="progressHovered"
                class="progress-hover-indicator"
                :style="{ left: `${progressHoverPercent}%` }"
              />
            </div>
            <span class="progress-text">{{ Math.round(progress) }}%</span>
            <!-- Progress Tooltip -->
            <div
              v-if="progressHovered"
              class="progress-tooltip"
              :style="{ left: `${progressTooltipX}px`, top: `${progressTooltipY}px` }"
            >
              {{ progressHoverPercent }}%
            </div>
          </div>
        </div>

        <!-- Note Timeline -->
        <div class="card timeline-section">
          <div class="timeline-header">
            <h3 class="timeline-title">Timeline</h3>
            <span class="timeline-info" v-if="mappingStore.noteCount > 0">
              {{ mappingStore.noteCount }} notes
            </span>
          </div>

          <div
            ref="timelineRef"
            class="timeline-scroll"
            @scroll="handleTimelineScroll"
          >
            <div
              class="timeline-track"
              :style="{ width: `${Math.max(mappingStore.notes.length * 8, 100)}px` }"
            >
              <div
                v-for="(note, index) in mappingStore.notes"
                :key="index"
                class="note-bar"
                :class="{
                  active: index === currentNoteIndex,
                  played: index < currentNoteIndex,
                  hovered: index === hoveredNoteIndex
                }"
                :style="{
                  height: `${Math.max((note.pitch - 36) * 1.5, 10)}px`,
                  opacity: 0.4 + (note.velocity / 127) * 0.6,
                  backgroundColor: getNoteColor(note.pitch),
                  boxShadow: index === currentNoteIndex ? `0 0 12px ${getNoteColor(note.pitch)}` : 'none'
                }"
                @mouseenter="handleNoteHover(index, $event)"
                @mouseleave="handleNoteLeave"
              />
            </div>
          </div>

          <!-- Tooltip -->
          <div
            v-if="hoveredNote"
            class="note-tooltip"
            :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
          >
            <div class="tooltip-note">{{ midiToNoteName(hoveredNote.pitch) }}</div>
            <div class="tooltip-details">
              <span>vel: {{ hoveredNote.velocity }}</span>
              <span>{{ hoveredNote.durationMs }}ms</span>
            </div>
          </div>
        </div>

        <!-- Now Playing -->
        <div v-if="currentNote" class="card now-playing">
          <div class="now-playing-grid">
            <div class="now-playing-note">
              <span class="note-name">{{ midiToNoteName(currentNote.pitch) }}</span>
              <span class="note-meta">vel: {{ currentNote.velocity }}</span>
            </div>
            <div v-if="currentCommit" class="now-playing-commit">
              <span class="commit-sha">{{ currentCommit.sha.slice(0, 7) }}</span>
              <span class="commit-message">{{ currentCommit.message?.slice(0, 50) }}</span>
              <span class="commit-author">{{ currentCommit.authorName }}</span>
            </div>
          </div>
        </div>
        </template>
      </main>
    </div>

    <!-- Export Modal -->
    <Teleport to="body">
      <div v-if="showExportModal" class="modal-overlay" @click.self="closeExportModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Export</h2>
            <button class="modal-close" @click="closeExportModal">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- Error -->
          <div v-if="exportError" class="export-error">
            <span>{{ exportError }}</span>
            <button @click="exportError = null">&times;</button>
          </div>

          <!-- Anonymize Toggle -->
          <div class="export-option">
            <label class="toggle-switch">
              <input type="checkbox" v-model="anonymize" />
              <span class="toggle-slider"></span>
            </label>
            <div class="toggle-info">
              <span class="toggle-label">Anonymize Data</span>
              <span class="toggle-desc">Remove author names, emails, and commit messages</span>
            </div>
          </div>

          <!-- Export Grid -->
          <div class="export-grid">
            <!-- Audio Section -->
            <div class="export-section">
              <h3>Audio Files</h3>
              <div class="export-buttons">
                <button class="btn btn-primary" @click="handleExportWav" :disabled="exportingWav">
                  <template v-if="exportingWav">
                    <div class="spinner-small"></div>
                    <span>Exporting...</span>
                  </template>
                  <template v-else>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    <span>WAV</span>
                  </template>
                </button>
                <button class="btn btn-primary" @click="handleExportMidi">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span>MIDI</span>
                </button>
              </div>
            </div>

            <!-- Data Section -->
            <div class="export-section">
              <h3>Data Files</h3>
              <div class="export-buttons">
                <button class="btn btn-primary" @click="handleExportBundle" :disabled="exportingZip">
                  <template v-if="exportingZip">
                    <div class="spinner-small"></div>
                    <span>Exporting...</span>
                  </template>
                  <template v-else>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    <span>ZIP Bundle</span>
                  </template>
                </button>
                <button class="btn btn-primary" @click="handleExportJson">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="export-stats">
            <div class="stat">
              <span class="stat-value">{{ repoStore.commitCount }}</span>
              <span class="stat-label">Commits</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ mappingStore.noteCount || '—' }}</span>
              <span class="stat-label">Notes</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ mappingStore.durationMs ? Math.round(mappingStore.durationMs / 1000) + 's' : '—' }}</span>
              <span class="stat-label">Duration</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.studio {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section {
  text-align: center;
  padding: 8px 0;
}

.header-section h1 {
  font-size: 28px;
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Rendering Overlay */
.rendering-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.rendering-content {
  text-align: center;
  color: white;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Grid Layout */
.studio-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
}

/* Controls Panel */
.controls-panel {
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 80px;
}

.panel-section {
  margin-bottom: 24px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.preset-select {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.setting-value {
  font-size: 13px;
  font-weight: 500;
}

.setting-row.editable {
  flex-direction: column;
  gap: 8px;
}

.setting-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-input input[type="range"] {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-tertiary);
  border-radius: 3px;
  cursor: pointer;
}

.setting-input input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.instrument-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-item:hover {
  background: var(--border);
}

.toggle-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.toggle-label {
  font-size: 12px;
  color: var(--text-primary);
}

.custom-select {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
}

.custom-select:focus {
  outline: none;
  border-color: var(--accent);
}

.octave-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.octave-input {
  width: 60px;
  padding: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;
}

.octave-input:focus {
  outline: none;
  border-color: var(--accent);
}

.octave-separator {
  color: var(--text-secondary);
  font-size: 14px;
}

.apply-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.stat-item .stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* Main Panel */
.main-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

/* No Instrument Warning */
.no-instrument-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border);
  border-radius: 16px;
  text-align: center;
  min-height: 300px;
}

.no-instrument-warning .warning-icon {
  width: 64px;
  height: 64px;
  color: var(--warning, #f59e0b);
  margin-bottom: 20px;
}

.no-instrument-warning .warning-icon svg {
  width: 100%;
  height: 100%;
}

.no-instrument-warning h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.no-instrument-warning p {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 320px;
  line-height: 1.5;
}

/* Transport */
.transport-section {
  padding: 24px;
}

.transport-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.transport-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.transport-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.transport-btn svg {
  width: 24px;
  height: 24px;
}

.play-btn {
  width: 72px;
  height: 72px;
  background: var(--accent);
  color: white;
}

.play-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.play-btn svg {
  width: 36px;
  height: 36px;
  margin-left: 4px;
}

.pause-btn {
  width: 72px;
  height: 72px;
  background: var(--warning);
  color: white;
}

.pause-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: scale(1.05);
}

.pause-btn svg {
  width: 32px;
  height: 32px;
}

.stop-btn {
  width: 48px;
  height: 48px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.stop-btn:hover:not(:disabled) {
  background: var(--border);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: visible;
  cursor: pointer;
  transition: height 0.15s ease;
  position: relative;
}

.progress-bar:hover {
  height: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10c1f6, #5ef28c);
  border-radius: 4px;
  transition: width 0.1s linear;
}

.progress-hover-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(-50%);
  pointer-events: none;
}

.progress-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  margin-top: -10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.progress-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--bg-secondary);
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 45px;
  text-align: right;
}

/* Timeline */
.timeline-section {
  padding: 20px;
  overflow: hidden;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
}

.timeline-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.timeline-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  max-width: 100%;
}

.timeline-scroll::-webkit-scrollbar {
  height: 8px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.timeline-track {
  display: flex;
  align-items: flex-end;
  height: 100px;
  gap: 2px;
  min-width: 100%;
}

.note-bar {
  width: 6px;
  min-width: 6px;
  border-radius: 2px 2px 0 0;
  cursor: pointer;
  transition: all 0.15s;
}

.note-bar:hover,
.note-bar.hovered {
  transform: scaleY(1.15);
  filter: brightness(1.3);
}

.note-bar.active {
  transform: scaleY(1.2);
  filter: brightness(1.4);
}

.note-bar.played {
  filter: saturate(0.5) brightness(0.7);
}

/* Tooltip */
.note-tooltip {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 100;
  transform: translateX(-50%);
}

.tooltip-note {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  text-align: center;
}

.tooltip-details {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Now Playing */
.now-playing {
  padding: 16px 20px;
}

.now-playing-grid {
  display: flex;
  align-items: center;
  gap: 24px;
}

.now-playing-note {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.note-name {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}

.note-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.now-playing-commit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.commit-sha {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent);
}

.commit-message {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-author {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .studio-grid {
    grid-template-columns: 1fr;
  }

  .controls-panel {
    position: static;
  }
}

/* Export Button */
.export-btn {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #10c1f6, #5ef28c);
  color: white;
  border: none;
}

.export-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: scale(1.05);
}

.export-btn:disabled {
  opacity: 0.4;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--border);
  color: var(--text-primary);
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.export-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  margin-bottom: 16px;
}

.export-error span {
  flex: 1;
  font-size: 13px;
}

.export-error button {
  background: none;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  margin-bottom: 20px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--bg-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-weight: 600;
  font-size: 13px;
}

.toggle-desc {
  font-size: 11px;
  color: var(--text-secondary);
}

.export-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.export-section h3 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.export-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.export-buttons .btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
}

.export-buttons .btn svg {
  width: 16px;
  height: 16px;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.export-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.export-stats .stat {
  text-align: center;
}

.export-stats .stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.export-stats .stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
}
</style>
