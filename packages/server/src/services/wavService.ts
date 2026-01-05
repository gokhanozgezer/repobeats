import { type NoteEvent } from '@repobeats/shared'

interface InstrumentSettings {
  guitar: boolean
  piano: boolean
  drums: boolean
  strings: boolean
}

interface WavRenderOptions {
  tempo: number
  instruments: InstrumentSettings
}

export class WavService {
  private sampleRate = 44100

  async render(notes: NoteEvent[], options: WavRenderOptions): Promise<Buffer> {
    if (notes.length === 0) {
      throw new Error('No notes to render')
    }

    // Calculate total duration
    const lastNote = notes[notes.length - 1]
    const totalDurationMs = lastNote ? lastNote.startMs + lastNote.durationMs + 500 : 1000
    const totalSamples = Math.ceil((totalDurationMs / 1000) * this.sampleRate)

    // Create stereo audio buffer
    const leftChannel = new Float32Array(totalSamples)
    const rightChannel = new Float32Array(totalSamples)

    // Count enabled instruments
    const enabledInstruments: string[] = []
    if (options.instruments.guitar) enabledInstruments.push('guitar')
    if (options.instruments.piano) enabledInstruments.push('piano')
    if (options.instruments.drums) enabledInstruments.push('drums')
    if (options.instruments.strings) enabledInstruments.push('strings')

    if (enabledInstruments.length === 0) {
      throw new Error('No instruments enabled')
    }

    // Render each note
    for (const note of notes) {
      const startSample = Math.floor((note.startMs / 1000) * this.sampleRate)
      const durationSamples = Math.floor((note.durationMs / 1000) * this.sampleRate)
      const frequency = this.midiToFrequency(note.pitch)
      const amplitude = (note.velocity / 127) * 0.3

      // Render with each enabled instrument
      for (const instrument of enabledInstruments) {
        this.renderNote(
          leftChannel,
          rightChannel,
          startSample,
          durationSamples,
          frequency,
          amplitude / enabledInstruments.length,
          instrument
        )
      }
    }

    // Normalize
    this.normalizeAudio(leftChannel, rightChannel)

    // Convert to WAV
    return this.encodeWav(leftChannel, rightChannel)
  }

  private renderNote(
    left: Float32Array,
    right: Float32Array,
    startSample: number,
    durationSamples: number,
    frequency: number,
    amplitude: number,
    instrument: string
  ): void {
    const endSample = Math.min(startSample + durationSamples, left.length)

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / this.sampleRate
      const progress = (i - startSample) / durationSamples

      // Envelope (ADSR simplified)
      let envelope = 1
      const attackTime = 0.01
      const releaseTime = 0.1
      const releaseStart = 1 - releaseTime

      if (t < attackTime) {
        envelope = t / attackTime
      } else if (progress > releaseStart) {
        envelope = 1 - ((progress - releaseStart) / releaseTime)
      }
      envelope = Math.max(0, Math.min(1, envelope))

      let sample = 0
      const phase = 2 * Math.PI * frequency * t

      switch (instrument) {
        case 'piano':
          // Piano-like: fundamental + harmonics with decay
          sample = Math.sin(phase) * 0.5
          sample += Math.sin(phase * 2) * 0.25 * Math.exp(-t * 3)
          sample += Math.sin(phase * 3) * 0.125 * Math.exp(-t * 5)
          break

        case 'guitar':
          // Guitar-like: plucked string simulation
          sample = Math.sin(phase) * 0.4 * Math.exp(-t * 2)
          sample += Math.sin(phase * 2) * 0.3 * Math.exp(-t * 3)
          sample += Math.sin(phase * 3) * 0.2 * Math.exp(-t * 4)
          sample += Math.sin(phase * 4) * 0.1 * Math.exp(-t * 5)
          break

        case 'strings':
          // Strings-like: rich harmonics with vibrato
          const vibrato = Math.sin(2 * Math.PI * 5 * t) * 0.003
          sample = Math.sin(phase * (1 + vibrato)) * 0.4
          sample += Math.sin(phase * 2 * (1 + vibrato)) * 0.3
          sample += Math.sin(phase * 3 * (1 + vibrato)) * 0.2
          break

        case 'drums':
          // Drum-like: noise burst with pitch
          if (t < 0.05) {
            sample = (Math.random() * 2 - 1) * Math.exp(-t * 30)
          }
          sample += Math.sin(phase * 0.5) * Math.exp(-t * 10) * 0.5
          break

        default:
          sample = Math.sin(phase)
      }

      sample *= amplitude * envelope

      // Slight stereo spread
      const pan = (frequency % 100) / 100 - 0.5
      left[i] = (left[i] ?? 0) + sample * (0.5 - pan * 0.3)
      right[i] = (right[i] ?? 0) + sample * (0.5 + pan * 0.3)
    }
  }

  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  private normalizeAudio(left: Float32Array, right: Float32Array): void {
    let maxAmp = 0
    for (let i = 0; i < left.length; i++) {
      const leftVal = left[i] ?? 0
      const rightVal = right[i] ?? 0
      maxAmp = Math.max(maxAmp, Math.abs(leftVal), Math.abs(rightVal))
    }

    if (maxAmp > 0.9) {
      const scale = 0.9 / maxAmp
      for (let i = 0; i < left.length; i++) {
        left[i] = (left[i] ?? 0) * scale
        right[i] = (right[i] ?? 0) * scale
      }
    }
  }

  private encodeWav(left: Float32Array, right: Float32Array): Buffer {
    const numChannels = 2
    const bitsPerSample = 16
    const bytesPerSample = bitsPerSample / 8
    const blockAlign = numChannels * bytesPerSample
    const byteRate = this.sampleRate * blockAlign
    const dataSize = left.length * blockAlign
    const bufferSize = 44 + dataSize

    const buffer = Buffer.alloc(bufferSize)
    let offset = 0

    // RIFF header
    buffer.write('RIFF', offset); offset += 4
    buffer.writeUInt32LE(bufferSize - 8, offset); offset += 4
    buffer.write('WAVE', offset); offset += 4

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4
    buffer.writeUInt32LE(16, offset); offset += 4 // chunk size
    buffer.writeUInt16LE(1, offset); offset += 2 // audio format (PCM)
    buffer.writeUInt16LE(numChannels, offset); offset += 2
    buffer.writeUInt32LE(this.sampleRate, offset); offset += 4
    buffer.writeUInt32LE(byteRate, offset); offset += 4
    buffer.writeUInt16LE(blockAlign, offset); offset += 2
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2

    // data chunk
    buffer.write('data', offset); offset += 4
    buffer.writeUInt32LE(dataSize, offset); offset += 4

    // Interleaved audio data
    for (let i = 0; i < left.length; i++) {
      const leftSample = Math.max(-1, Math.min(1, left[i] ?? 0))
      const rightSample = Math.max(-1, Math.min(1, right[i] ?? 0))

      buffer.writeInt16LE(Math.round(leftSample * 32767), offset); offset += 2
      buffer.writeInt16LE(Math.round(rightSample * 32767), offset); offset += 2
    }

    return buffer
  }
}
