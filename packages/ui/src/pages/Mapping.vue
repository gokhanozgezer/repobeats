<script setup lang="ts">
import { computed } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { useRepoStore } from '@/stores/repo'
import { PRESETS, type PresetName } from '@repobeats/shared'
import MappingEditor from '@/components/MappingEditor.vue'

const mappingStore = useMappingStore()
const repoStore = useRepoStore()

const presetOptions = computed(() =>
  Object.entries(PRESETS).map(([key, preset]) => ({
    value: key as PresetName,
    label: preset.name ?? key
  }))
)

function handlePresetChange(event: Event) {
  const target = event.target as HTMLSelectElement
  mappingStore.setPreset(target.value as PresetName)
}

async function handlePreview() {
  await mappingStore.render()
}
</script>

<template>
  <div class="mapping-page">
    <section class="header-section">
      <h1>Mapping Configuration</h1>
      <p class="subtitle">Define how your commits transform into music</p>
    </section>

    <div class="content-grid">
      <section class="card presets-section">
        <div class="card-header">
          <h2 class="card-title">Presets</h2>
        </div>
        <div class="preset-selector">
          <label class="label">Select Preset</label>
          <select
            :value="mappingStore.currentPreset"
            @change="handlePresetChange"
            class="preset-select"
          >
            <option
              v-for="preset in presetOptions"
              :key="preset.value"
              :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </div>
        <div class="preset-preview">
          <div class="preview-item">
            <span class="preview-label">Tempo</span>
            <span class="preview-value">{{ mappingStore.mapping.tempo.bpm }} BPM</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Scale</span>
            <span class="preview-value">{{ mappingStore.mapping.pitch.scale }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Duration</span>
            <span class="preview-value">{{ mappingStore.mapping.duration.minMs }}-{{ mappingStore.mapping.duration.maxMs }}ms</span>
          </div>
        </div>
      </section>

      <section class="card editor-section">
        <div class="card-header">
          <h2 class="card-title">Custom Mapping</h2>
          <button
            class="btn btn-primary"
            @click="handlePreview"
            :disabled="mappingStore.rendering || repoStore.commits.length === 0"
          >
            {{ mappingStore.rendering ? 'Rendering...' : 'Preview' }}
          </button>
        </div>
        <MappingEditor />
      </section>
    </div>

    <div v-if="mappingStore.error" class="error">
      {{ mappingStore.error }}
    </div>

    <section v-if="mappingStore.renderResult" class="card result-section">
      <div class="card-header">
        <h2 class="card-title">Preview Result</h2>
      </div>
      <div class="result-stats">
        <div class="stat">
          <span class="stat-value">{{ mappingStore.noteCount }}</span>
          <span class="stat-label">Notes</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ Math.round(mappingStore.durationMs / 1000) }}s</span>
          <span class="stat-label">Duration</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ mappingStore.mapping.tempo.bpm }}</span>
          <span class="stat-label">BPM</span>
        </div>
      </div>
      <p class="hint">Go to Playback tab to listen to your creation!</p>
    </section>
  </div>
</template>

<style scoped>
.mapping-page {
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

.content-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

.preset-selector {
  margin-bottom: 24px;
}

.preset-select {
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

.preset-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
}

.preview-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.preview-value {
  font-weight: 500;
}

.result-stats {
  display: flex;
  gap: 48px;
  justify-content: center;
  padding: 24px 0;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.hint {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 800px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
