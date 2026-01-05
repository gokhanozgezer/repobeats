import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PresetName } from '@repobeats/shared'
import { PRESETS } from '@repobeats/shared'

export interface InstrumentSettings {
  guitar: boolean
  piano: boolean
  drums: boolean
  strings: boolean
}

export type ScaleName = 'chromatic' | 'major' | 'minor' | 'pentatonic' | 'blues' | 'dorian'

export interface PlaybackSettings {
  tempo: number
  scale: ScaleName
  octaveMin: number
  octaveMax: number
  instruments: InstrumentSettings
}

const DEFAULT_SETTINGS: PlaybackSettings = {
  tempo: 120,
  scale: 'pentatonic',
  octaveMin: 3,
  octaveMax: 6,
  instruments: {
    guitar: true,
    piano: true,
    drums: true,
    strings: true
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const selectedPreset = ref<string>('default')
  const isCustomMode = ref(false)

  const tempo = ref(DEFAULT_SETTINGS.tempo)
  const scale = ref<ScaleName>(DEFAULT_SETTINGS.scale)
  const octaveMin = ref(DEFAULT_SETTINGS.octaveMin)
  const octaveMax = ref(DEFAULT_SETTINGS.octaveMax)
  const instruments = ref<InstrumentSettings>({ ...DEFAULT_SETTINGS.instruments })

  const currentSettings = computed<PlaybackSettings>(() => ({
    tempo: tempo.value,
    scale: scale.value,
    octaveMin: octaveMin.value,
    octaveMax: octaveMax.value,
    instruments: { ...instruments.value }
  }))

  function setPreset(presetName: string) {
    selectedPreset.value = presetName

    if (presetName === 'custom') {
      isCustomMode.value = true
      return
    }

    isCustomMode.value = false

    const preset = PRESETS[presetName as PresetName]
    if (preset) {
      tempo.value = preset.tempo?.bpm ?? DEFAULT_SETTINGS.tempo
      scale.value = (preset.pitch?.scale ?? DEFAULT_SETTINGS.scale) as ScaleName
      octaveMin.value = preset.pitch?.octaveMin ?? DEFAULT_SETTINGS.octaveMin
      octaveMax.value = preset.pitch?.octaveMax ?? DEFAULT_SETTINGS.octaveMax
    }
  }

  function setTempo(bpm: number) {
    tempo.value = bpm
  }

  function setScale(newScale: ScaleName) {
    scale.value = newScale
  }

  function setOctaveRange(min: number, max: number) {
    octaveMin.value = min
    octaveMax.value = max
  }

  function setInstrument(name: keyof InstrumentSettings, enabled: boolean) {
    instruments.value[name] = enabled
  }

  function setInstruments(settings: Partial<InstrumentSettings>) {
    instruments.value = { ...instruments.value, ...settings }
  }

  function enableCustomMode() {
    isCustomMode.value = true
    selectedPreset.value = 'custom'
  }

  function reset() {
    selectedPreset.value = 'default'
    isCustomMode.value = false
    tempo.value = DEFAULT_SETTINGS.tempo
    scale.value = DEFAULT_SETTINGS.scale
    octaveMin.value = DEFAULT_SETTINGS.octaveMin
    octaveMax.value = DEFAULT_SETTINGS.octaveMax
    instruments.value = { ...DEFAULT_SETTINGS.instruments }
  }

  return {
    // State
    selectedPreset,
    isCustomMode,
    tempo,
    scale,
    octaveMin,
    octaveMax,
    instruments,

    // Computed
    currentSettings,

    // Actions
    setPreset,
    setTempo,
    setScale,
    setOctaveRange,
    setInstrument,
    setInstruments,
    enableCustomMode,
    reset
  }
})
