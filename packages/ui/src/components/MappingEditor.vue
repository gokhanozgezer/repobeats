<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'

const mappingStore = useMappingStore()

const pitchSources = [
  { value: 'sha', label: 'Commit SHA' },
  { value: 'author', label: 'Author' },
  { value: 'hour', label: 'Hour of Day' },
  { value: 'dayOfWeek', label: 'Day of Week' }
]

const scales = [
  { value: 'chromatic', label: 'Chromatic' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'pentatonic', label: 'Pentatonic' },
  { value: 'blues', label: 'Blues' },
  { value: 'dorian', label: 'Dorian' }
]

const durationSources = [
  { value: 'diff', label: 'Diff Size' },
  { value: 'files', label: 'Files Changed' },
  { value: 'messageLength', label: 'Message Length' },
  { value: 'fixed', label: 'Fixed' }
]

const velocitySources = [
  { value: 'additions', label: 'Lines Added' },
  { value: 'deletions', label: 'Lines Deleted' },
  { value: 'files', label: 'Files Changed' },
  { value: 'messageLength', label: 'Message Length' },
  { value: 'timeOfDay', label: 'Time of Day' },
  { value: 'fixed', label: 'Fixed' }
]
</script>

<template>
  <div class="mapping-editor">
    <div class="editor-section">
      <h4 class="section-title">Tempo</h4>
      <div class="field-group">
        <div class="field">
          <label class="label">BPM</label>
          <input
            type="number"
            :value="mappingStore.mapping.tempo.bpm"
            @input="mappingStore.updateTempo({ bpm: +($event.target as HTMLInputElement).value })"
            min="20"
            max="300"
          />
        </div>
        <div class="field">
          <label class="label">Mode</label>
          <select
            :value="mappingStore.mapping.tempo.mode"
            @change="mappingStore.updateTempo({ mode: ($event.target as HTMLSelectElement).value as 'fixed' | 'frequency' })"
          >
            <option value="fixed">Fixed</option>
            <option value="frequency">Frequency-based</option>
          </select>
        </div>
      </div>
    </div>

    <div class="editor-section">
      <h4 class="section-title">Pitch</h4>
      <div class="field-group">
        <div class="field">
          <label class="label">Source</label>
          <select
            :value="mappingStore.mapping.pitch.source"
            @change="mappingStore.updatePitch({ source: ($event.target as HTMLSelectElement).value as any })"
          >
            <option
              v-for="opt in pitchSources"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="field">
          <label class="label">Scale</label>
          <select
            :value="mappingStore.mapping.pitch.scale"
            @change="mappingStore.updatePitch({ scale: ($event.target as HTMLSelectElement).value as any })"
          >
            <option
              v-for="opt in scales"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <div class="field">
          <label class="label">Octave Min</label>
          <input
            type="number"
            :value="mappingStore.mapping.pitch.octaveMin"
            @input="mappingStore.updatePitch({ octaveMin: +($event.target as HTMLInputElement).value })"
            min="0"
            max="8"
          />
        </div>
        <div class="field">
          <label class="label">Octave Max</label>
          <input
            type="number"
            :value="mappingStore.mapping.pitch.octaveMax"
            @input="mappingStore.updatePitch({ octaveMax: +($event.target as HTMLInputElement).value })"
            min="0"
            max="8"
          />
        </div>
      </div>
    </div>

    <div class="editor-section">
      <h4 class="section-title">Duration</h4>
      <div class="field-group">
        <div class="field">
          <label class="label">Source</label>
          <select
            :value="mappingStore.mapping.duration.source"
            @change="mappingStore.updateDuration({ source: ($event.target as HTMLSelectElement).value as any })"
          >
            <option
              v-for="opt in durationSources"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <div class="field">
          <label class="label">Min (ms)</label>
          <input
            type="number"
            :value="mappingStore.mapping.duration.minMs"
            @input="mappingStore.updateDuration({ minMs: +($event.target as HTMLInputElement).value })"
            min="50"
            max="5000"
          />
        </div>
        <div class="field">
          <label class="label">Max (ms)</label>
          <input
            type="number"
            :value="mappingStore.mapping.duration.maxMs"
            @input="mappingStore.updateDuration({ maxMs: +($event.target as HTMLInputElement).value })"
            min="100"
            max="10000"
          />
        </div>
      </div>
    </div>

    <div class="editor-section">
      <h4 class="section-title">Velocity</h4>
      <div class="field-group">
        <div class="field">
          <label class="label">Source</label>
          <select
            :value="mappingStore.mapping.velocity.source"
            @change="mappingStore.updateVelocity({ source: ($event.target as HTMLSelectElement).value as any })"
          >
            <option
              v-for="opt in velocitySources"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <div class="field">
          <label class="label">Min (1-127)</label>
          <input
            type="number"
            :value="mappingStore.mapping.velocity.min"
            @input="mappingStore.updateVelocity({ min: +($event.target as HTMLInputElement).value })"
            min="1"
            max="127"
          />
        </div>
        <div class="field">
          <label class="label">Max (1-127)</label>
          <input
            type="number"
            :value="mappingStore.mapping.velocity.max"
            @input="mappingStore.updateVelocity({ max: +($event.target as HTMLInputElement).value })"
            min="1"
            max="127"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mapping-editor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-section {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.editor-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.field-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.field-group:last-child {
  margin-bottom: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field input,
.field select {
  width: 100%;
}
</style>
