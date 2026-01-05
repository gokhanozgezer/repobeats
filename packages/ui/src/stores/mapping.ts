import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MappingConfig, RenderResult, NoteEvent } from '@repobeats/shared'
import { PRESETS, type PresetName } from '@repobeats/shared'
import { api } from '@/lib/api'
import { useRepoStore } from './repo'

export const useMappingStore = defineStore('mapping', () => {
  const currentPreset = ref<PresetName>('default')
  const mapping = ref<MappingConfig>({ ...PRESETS.default })
  const renderResult = ref<RenderResult | null>(null)
  const rendering = ref(false)
  const error = ref<string | null>(null)

  const notes = computed<NoteEvent[]>(() => renderResult.value?.notes ?? [])
  const durationMs = computed(() => renderResult.value?.durationMs ?? 0)
  const noteCount = computed(() => renderResult.value?.noteCount ?? 0)

  function setPreset(name: PresetName) {
    currentPreset.value = name
    mapping.value = { ...PRESETS[name] }
  }

  function updateMapping(updates: Partial<MappingConfig>) {
    mapping.value = { ...mapping.value, ...updates }
    currentPreset.value = 'default'
  }

  function updateTempo(updates: Partial<MappingConfig['tempo']>) {
    mapping.value.tempo = { ...mapping.value.tempo, ...updates }
  }

  function updatePitch(updates: Partial<MappingConfig['pitch']>) {
    mapping.value.pitch = { ...mapping.value.pitch, ...updates }
  }

  function updateDuration(updates: Partial<MappingConfig['duration']>) {
    mapping.value.duration = { ...mapping.value.duration, ...updates }
  }

  function updateVelocity(updates: Partial<MappingConfig['velocity']>) {
    mapping.value.velocity = { ...mapping.value.velocity, ...updates }
  }

  async function render() {
    const repoStore = useRepoStore()

    if (repoStore.commits.length === 0) {
      error.value = 'No commits loaded'
      return
    }

    rendering.value = true
    error.value = null

    try {
      renderResult.value = await api.renderMidi(repoStore.commits, mapping.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Render failed'
    } finally {
      rendering.value = false
    }
  }

  return {
    currentPreset,
    mapping,
    renderResult,
    rendering,
    error,
    notes,
    durationMs,
    noteCount,
    setPreset,
    updateMapping,
    updateTempo,
    updatePitch,
    updateDuration,
    updateVelocity,
    render
  }
})
