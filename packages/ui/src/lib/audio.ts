import type { NoteEvent } from '@repobeats/shared'

// Playback settings type
export interface PlaybackSettings {
  tempo: number // BPM
  instruments: {
    guitar: boolean
    piano: boolean
    drums: boolean
    strings: boolean
  }
}

export const DEFAULT_SETTINGS: PlaybackSettings = {
  tempo: 80,
  instruments: {
    guitar: true,
    piano: true,
    drums: true,
    strings: true
  }
}

let audioContext: AudioContext | null = null
let player: any = null
let isInitialized = false
let isLoading = false

// Instruments
let guitarInstrument: any = null
let pianoInstrument: any = null
let stringsInstrument: any = null

// Effects (using Web Audio API)
let masterGain: GainNode | null = null
let reverbNode: ConvolverNode | null = null

// Instrument URLs - local files (no CDN dependency)
const INSTRUMENT_URLS = {
  // Acoustic Guitar (steel) - GM 25
  guitar: '/sounds/0250_SoundBlasterOld_sf2.js',
  guitarVar: '_tone_0250_SoundBlasterOld_sf2',
  // Piano - GM 0
  piano: '/sounds/0000_JCLive_sf2_file.js',
  pianoVar: '_tone_0000_JCLive_sf2_file',
  // String Ensemble - GM 48
  strings: '/sounds/0480_GeneralUserGS_sf2_file.js',
  stringsVar: '_tone_0480_GeneralUserGS_sf2_file',
  // Drums - Standard kit
  drums: '/sounds/12835_0_FluidR3_GM_sf2_file.js',
  drumsVar: '_drum_35_0_FluidR3_GM_sf2_file'
}

// Load script dynamically
async function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// Create simple reverb impulse
async function createReverbImpulse(ctx: AudioContext, duration: number = 2, decay: number = 2): Promise<AudioBuffer> {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const impulse = ctx.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

// Load WebAudioFontPlayer from local file
async function loadWebAudioFontPlayer(): Promise<void> {
  if ((window as any).WebAudioFontPlayer) return

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/sounds/WebAudioFontPlayer.js'
    script.onload = () => {
      // Wait a tick for the script to fully execute
      setTimeout(resolve, 100)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })

  // Verify it loaded
  if (!(window as any).WebAudioFontPlayer) {
    throw new Error('WebAudioFontPlayer failed to load')
  }
}

export async function initAudio(): Promise<void> {
  if (isInitialized) return
  if (isLoading) return
  isLoading = true

  try {
    // Load WebAudioFont player from CDN
    await loadWebAudioFontPlayer()

    // Create audio context
    audioContext = new AudioContext()
    player = new (window as any).WebAudioFontPlayer()

    // Create master gain
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.8
    masterGain.connect(audioContext.destination)

    // Create reverb
    reverbNode = audioContext.createConvolver()
    reverbNode.buffer = await createReverbImpulse(audioContext, 2.5, 2)

    const reverbGain = audioContext.createGain()
    reverbGain.gain.value = 0.3
    reverbNode.connect(reverbGain)
    reverbGain.connect(masterGain)

    // Load instruments
    console.log('Loading instruments...')

    // Load guitar
    await loadScript(INSTRUMENT_URLS.guitar)
    guitarInstrument = (window as any)[INSTRUMENT_URLS.guitarVar]
    player.adjustPreset(audioContext, guitarInstrument)
    console.log('Guitar loaded')

    // Load piano
    await loadScript(INSTRUMENT_URLS.piano)
    pianoInstrument = (window as any)[INSTRUMENT_URLS.pianoVar]
    player.adjustPreset(audioContext, pianoInstrument)
    console.log('Piano loaded')

    // Load strings
    await loadScript(INSTRUMENT_URLS.strings)
    stringsInstrument = (window as any)[INSTRUMENT_URLS.stringsVar]
    player.adjustPreset(audioContext, stringsInstrument)
    console.log('Strings loaded')

    // Load drums (multiple drum sounds) - local files
    await loadScript('/sounds/12835_0_FluidR3_GM_sf2_file.js')
    await loadScript('/sounds/12838_0_FluidR3_GM_sf2_file.js')
    await loadScript('/sounds/12842_0_FluidR3_GM_sf2_file.js')

    // Adjust drum presets
    const kickDrum = (window as any)._drum_35_0_FluidR3_GM_sf2_file
    const snareDrum = (window as any)._drum_38_0_FluidR3_GM_sf2_file
    const hihatDrum = (window as any)._drum_42_0_FluidR3_GM_sf2_file
    if (kickDrum) player.adjustPreset(audioContext, kickDrum)
    if (snareDrum) player.adjustPreset(audioContext, snareDrum)
    if (hihatDrum) player.adjustPreset(audioContext, hihatDrum)
    console.log('Drums loaded')

    isInitialized = true
    console.log('Audio initialized with WebAudioFont')
  } catch (err) {
    console.error('Failed to initialize audio:', err)
  } finally {
    isLoading = false
  }
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = notes[midi % 12]
  return `${note}${octave}`
}

export function getNoteColor(pitch: number): string {
  const hue = ((pitch - 36) / 48) * 280
  return `hsl(${260 - hue}, 75%, 55%)`
}

// Musical scales
const PENTATONIC_OFFSETS = [0, 2, 4, 7, 9]

function quantizeToPentatonic(pitch: number, rootNote: number = 48): number {
  const octave = Math.floor((pitch - rootNote) / 12)
  const noteInOctave = ((pitch - rootNote) % 12 + 12) % 12

  let closest = PENTATONIC_OFFSETS[0]
  let minDist = Math.abs(noteInOctave - closest)

  for (const offset of PENTATONIC_OFFSETS) {
    const dist = Math.abs(noteInOctave - offset)
    if (dist < minDist) {
      minDist = dist
      closest = offset
    }
  }

  return rootNote + octave * 12 + closest
}

// Play note with WebAudioFont
function playNote(
  instrument: any,
  pitch: number,
  time: number,
  duration: number,
  volume: number = 1
): any {
  if (!audioContext || !player || !instrument || !masterGain) return null

  return player.queueWaveTable(
    audioContext,
    masterGain,
    instrument,
    time,
    pitch,
    duration,
    volume
  )
}

let isPlaying = false
let onPlaybackEnd: (() => void) | null = null
let animationFrameId: number | null = null
let startTime: number = 0
let totalDuration: number = 0
let currentProgressCallback: ((index: number) => void) | null = null
let notesRef: NoteEvent[] = []

export async function playNotes(
  notes: NoteEvent[],
  onProgress?: (index: number) => void,
  onEnd?: () => void,
  settings: PlaybackSettings = DEFAULT_SETTINGS
): Promise<void> {
  await initAudio()

  if (!audioContext || !player || notes.length === 0) return

  // Cancel any previous playback
  if (isPlaying) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    if (player && audioContext) {
      try {
        player.cancelQueue(audioContext)
      } catch (e) {
        // ignore
      }
    }
  }

  // Resume audio context if suspended
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  isPlaying = true
  onPlaybackEnd = onEnd ?? null
  currentProgressCallback = onProgress ?? null
  notesRef = notes

  // Simple timing: each note gets equal spacing
  const noteSpacing = 60 / settings.tempo // seconds per beat
  const minSpacing = 0.15 // minimum 150ms between notes
  const actualSpacing = Math.max(noteSpacing, minSpacing)

  totalDuration = notes.length * actualSpacing + 2
  startTime = audioContext.currentTime

  // Check if any instrument is enabled
  const hasAnyInstrument = settings.instruments.guitar ||
                           settings.instruments.piano ||
                           settings.instruments.drums ||
                           settings.instruments.strings

  // Determine which instrument to use for melody
  const melodyInstrument = settings.instruments.guitar ? guitarInstrument :
                           settings.instruments.piano ? pianoInstrument :
                           settings.instruments.strings ? stringsInstrument : null

  // Play melody notes (or silent playback if no instruments)
  if (melodyInstrument && hasAnyInstrument) {
    let lastPitch = -1

    notes.forEach((note, index) => {
      const noteStartTime = startTime + index * actualSpacing

      // Quantize to pentatonic for pleasant sound
      const quantizedPitch = quantizeToPentatonic(note.pitch, 48) // C3 root

      // Skip if same pitch as last (avoid repetition)
      if (quantizedPitch === lastPitch && index > 0) {
        // Shift octave for variety
        const shiftedPitch = quantizedPitch + (index % 2 === 0 ? 12 : -12)
        playNote(melodyInstrument, Math.max(36, Math.min(84, shiftedPitch)), noteStartTime, actualSpacing * 0.8, 0.6)
      } else {
        playNote(melodyInstrument, quantizedPitch, noteStartTime, actualSpacing * 0.8, 0.6)
      }
      lastPitch = quantizedPitch
    })
  }

  // Piano accompaniment (plays chords on every 4th note)
  if (settings.instruments.piano && pianoInstrument && settings.instruments.guitar) {
    notes.forEach((note, index) => {
      if (index % 4 === 0) {
        const noteStartTime = startTime + index * actualSpacing
        const rootPitch = quantizeToPentatonic(note.pitch, 36) // Lower octave
        // Play a simple chord (root + fifth)
        playNote(pianoInstrument, rootPitch, noteStartTime, actualSpacing * 2, 0.3)
        playNote(pianoInstrument, rootPitch + 7, noteStartTime, actualSpacing * 2, 0.25)
      }
    })
  }

  // Drums - simple beat pattern
  if (settings.instruments.drums) {
    const kickDrum = (window as any)._drum_35_0_FluidR3_GM_sf2_file
    const snareDrum = (window as any)._drum_38_0_FluidR3_GM_sf2_file
    const hihat = (window as any)._drum_42_0_FluidR3_GM_sf2_file

    notes.forEach((_, index) => {
      const noteStartTime = startTime + index * actualSpacing

      // Kick on 1 and 3
      if (kickDrum && index % 4 === 0) {
        playNote(kickDrum, 36, noteStartTime, 0.3, 0.5)
      }
      // Snare on 2 and 4
      if (snareDrum && index % 4 === 2) {
        playNote(snareDrum, 38, noteStartTime, 0.2, 0.4)
      }
      // Hi-hat on every beat
      if (hihat && index % 2 === 0) {
        playNote(hihat, 42, noteStartTime, 0.1, 0.25)
      }
    })
  }

  // Strings pad in background
  if (settings.instruments.strings && stringsInstrument && (settings.instruments.guitar || settings.instruments.piano)) {
    const padNotes = [48, 52, 55, 60] // C major 7
    padNotes.forEach(pitch => {
      playNote(stringsInstrument, pitch, startTime, totalDuration * 0.9, 0.08)
    })
  }

  // Start progress tracking
  trackProgress()
}

function trackProgress(): void {
  if (!audioContext || !isPlaying) return

  const elapsed = audioContext.currentTime - startTime

  // Find current note index based on elapsed time and note spacing
  if (currentProgressCallback && notesRef.length > 0) {
    const noteSpacing = totalDuration / notesRef.length
    const currentIndex = Math.min(Math.floor(elapsed / noteSpacing), notesRef.length - 1)
    currentProgressCallback(Math.max(0, currentIndex))
  }

  // Check if playback is done
  if (elapsed >= totalDuration) {
    isPlaying = false
    if (onPlaybackEnd) {
      onPlaybackEnd()
      onPlaybackEnd = null
    }
    return
  }

  animationFrameId = requestAnimationFrame(trackProgress)
}

export function stopPlayback(): void {
  isPlaying = false
  onPlaybackEnd = null
  currentProgressCallback = null

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (player && audioContext) {
    try {
      player.cancelQueue(audioContext)
    } catch (e) {
      // ignore
    }
  }
}

export function pausePlayback(): void {
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend()
  }
}

export function resumePlayback(): void {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume()
  }
}

export function seekTo(_timeMs: number): void {
  // WebAudioFont doesn't support seek well, would need to restart from position
  console.log('Seek not fully implemented for WebAudioFont')
}

export function getPlaybackPosition(): number {
  if (!audioContext) return 0
  return (audioContext.currentTime - startTime) * 1000
}

export function isPlayingNow(): boolean {
  return isPlaying
}

export function setVolume(db: number): void {
  if (masterGain) {
    masterGain.gain.value = Math.pow(10, db / 20)
  }
}

export function downloadMidi(base64: string, filename: string): void {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Export settings interface
export interface ExportSettings {
  tempo: number
  scale: 'chromatic' | 'major' | 'minor' | 'pentatonic' | 'blues' | 'dorian'
  octaveMin: number
  octaveMax: number
  instruments: {
    guitar: boolean
    piano: boolean
    drums: boolean
    strings: boolean
  }
}

// WAV Export - records actual WebAudioFont playback
export async function exportToWav(
  notes: NoteEvent[],
  filename: string,
  onProgress?: (percent: number) => void,
  settings?: ExportSettings
): Promise<void> {
  if (notes.length === 0) return

  // Default settings if not provided
  const exportSettings = settings ?? {
    tempo: 120,
    scale: 'pentatonic' as const,
    octaveMin: 3,
    octaveMax: 6,
    instruments: { guitar: true, piano: true, drums: true, strings: true }
  }

  try {
    // Initialize audio if needed
    await initAudio()
    if (!audioContext || !player) {
      throw new Error('Audio not initialized')
    }

    onProgress?.(10)

    // Create offline context for rendering
    const noteSpacing = 60 / exportSettings.tempo
    const minSpacing = 0.15
    const actualSpacing = Math.max(noteSpacing, minSpacing)
    const totalDuration = notes.length * actualSpacing + 2

    // Limit duration to 3 minutes max
    const maxDuration = Math.min(totalDuration, 180)
    const maxNotes = Math.min(notes.length, Math.floor((maxDuration - 2) / actualSpacing))

    // Create offline audio context
    const sampleRate = 44100
    const offlineCtx = new OfflineAudioContext(2, sampleRate * maxDuration, sampleRate)

    onProgress?.(20)

    // Create gain node for mixing
    const mixerGain = offlineCtx.createGain()
    mixerGain.gain.value = 0.8
    mixerGain.connect(offlineCtx.destination)

    // We need to reload instruments for offline context
    const offlinePlayer = new (window as any).WebAudioFontPlayer()

    // Get instruments
    const instruments = exportSettings.instruments
    const melodyInstrument = instruments.guitar ? guitarInstrument :
                             instruments.piano ? pianoInstrument :
                             instruments.strings ? stringsInstrument : null

    if (!melodyInstrument) {
      throw new Error('No instrument selected')
    }

    onProgress?.(30)

    // Schedule all notes
    let lastPitch = -1

    for (let index = 0; index < maxNotes; index++) {
      const note = notes[index]
      const noteStartTime = index * actualSpacing + 0.3

      // Quantize to pentatonic
      let quantizedPitch = quantizeToPentatonic(note.pitch, 48)

      // Avoid repetition
      if (quantizedPitch === lastPitch && index > 0) {
        quantizedPitch = quantizedPitch + (index % 2 === 0 ? 12 : -12)
        quantizedPitch = Math.max(36, Math.min(84, quantizedPitch))
      }
      lastPitch = quantizedPitch

      // Play melody
      offlinePlayer.queueWaveTable(
        offlineCtx,
        mixerGain,
        melodyInstrument,
        noteStartTime,
        quantizedPitch,
        actualSpacing * 0.8,
        0.6
      )

      // Piano accompaniment (chords on every 4th note)
      if (instruments.piano && pianoInstrument && instruments.guitar && index % 4 === 0) {
        const rootPitch = quantizeToPentatonic(note.pitch, 36)
        offlinePlayer.queueWaveTable(offlineCtx, mixerGain, pianoInstrument, noteStartTime, rootPitch, actualSpacing * 2, 0.3)
        offlinePlayer.queueWaveTable(offlineCtx, mixerGain, pianoInstrument, noteStartTime, rootPitch + 7, actualSpacing * 2, 0.25)
      }

      // Drums
      if (instruments.drums) {
        const kickDrum = (window as any)._drum_35_0_FluidR3_GM_sf2_file
        const snareDrum = (window as any)._drum_38_0_FluidR3_GM_sf2_file
        const hihat = (window as any)._drum_42_0_FluidR3_GM_sf2_file

        if (kickDrum && index % 4 === 0) {
          offlinePlayer.queueWaveTable(offlineCtx, mixerGain, kickDrum, noteStartTime, 36, 0.3, 0.5)
        }
        if (snareDrum && index % 4 === 2) {
          offlinePlayer.queueWaveTable(offlineCtx, mixerGain, snareDrum, noteStartTime, 38, 0.2, 0.4)
        }
        if (hihat && index % 2 === 0) {
          offlinePlayer.queueWaveTable(offlineCtx, mixerGain, hihat, noteStartTime, 42, 0.1, 0.25)
        }
      }

      // Update progress periodically
      if (index % 100 === 0) {
        onProgress?.(30 + Math.floor((index / maxNotes) * 30))
      }
    }

    // Strings pad
    if (instruments.strings && stringsInstrument && (instruments.guitar || instruments.piano)) {
      const padNotes = [48, 52, 55, 60]
      padNotes.forEach(pitch => {
        offlinePlayer.queueWaveTable(offlineCtx, mixerGain, stringsInstrument, 0.1, pitch, maxDuration * 0.9, 0.08)
      })
    }

    onProgress?.(60)

    // Render audio
    const renderedBuffer = await offlineCtx.startRendering()

    onProgress?.(80)

    // Convert to WAV
    const wavBlob = audioBufferToWav(renderedBuffer)

    onProgress?.(90)

    // Download
    const url = URL.createObjectURL(wavBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    onProgress?.(100)
  } catch (error) {
    console.error('WAV export error:', error)
    throw error
  }
}

// Convert AudioBuffer to WAV blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample

  const wavBuffer = new ArrayBuffer(44 + length * blockAlign)
  const view = new DataView(wavBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // WAV header
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * blockAlign, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(36, 'data')
  view.setUint32(40, length * blockAlign, true)

  // Get channel data
  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c))
  }

  // Write samples (interleaved)
  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' })
}
