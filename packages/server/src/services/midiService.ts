import MidiWriter from 'midi-writer-js'
import {
  type CommitEvent,
  type MappingConfig,
  type NoteEvent,
  type RenderResult,
  hashString,
  getHourOfDay,
  getDayOfWeek,
  getNoteInScale,
  RenderError
} from '@repobeats/shared'

export class MidiService {
  render(commits: CommitEvent[], mapping: MappingConfig): RenderResult {
    try {
      if (commits.length === 0) {
        throw new RenderError('No commits to render')
      }

      const sortedCommits = [...commits].sort((a, b) => a.timestamp - b.timestamp)

      // Tempo scaling: 120 BPM is base, higher BPM = faster (shorter notes)
      const baseTempo = 120
      const tempoScale = baseTempo / mapping.tempo.bpm

      const notes: NoteEvent[] = []
      let currentTimeMs = 0

      for (const commit of sortedCommits) {
        const pitch = this.calculatePitch(commit, mapping)
        const velocity = this.calculateVelocity(commit, mapping)
        const baseDurationMs = this.calculateDuration(commit, mapping)

        // Apply tempo scaling to duration
        const durationMs = Math.round(baseDurationMs * tempoScale)

        notes.push({
          pitch,
          velocity,
          startMs: currentTimeMs,
          durationMs,
          commitSha: commit.sha
        })

        currentTimeMs += durationMs
      }

      const midiBase64 = this.generateMidi(notes, mapping)

      return {
        midiBase64,
        notes,
        durationMs: currentTimeMs,
        noteCount: notes.length
      }
    } catch (error) {
      if (error instanceof RenderError) throw error
      throw new RenderError(String(error))
    }
  }

  private calculatePitch(commit: CommitEvent, mapping: MappingConfig): number {
    const { pitch } = mapping

    let value: number
    switch (pitch.source) {
      case 'sha':
        value = hashString(commit.sha)
        break
      case 'author':
        value = hashString(commit.authorName ?? 'unknown')
        break
      case 'hour':
        value = getHourOfDay(commit.timestamp)
        break
      case 'dayOfWeek':
        value = getDayOfWeek(commit.timestamp)
        break
      default:
        value = hashString(commit.sha)
    }

    return getNoteInScale(
      value,
      pitch.scale,
      pitch.rootNote,
      pitch.octaveMin,
      pitch.octaveMax
    )
  }

  private calculateVelocity(commit: CommitEvent, mapping: MappingConfig): number {
    const { velocity } = mapping

    let normalized: number
    switch (velocity.source) {
      case 'additions':
        normalized = Math.min((commit.additions ?? 0) / 500, 1)
        break
      case 'deletions':
        normalized = Math.min((commit.deletions ?? 0) / 500, 1)
        break
      case 'files':
        normalized = Math.min((commit.filesChanged ?? 1) / 20, 1)
        break
      case 'messageLength':
        normalized = Math.min((commit.message?.length ?? 50) / 200, 1)
        break
      case 'timeOfDay': {
        const hour = getHourOfDay(commit.timestamp)
        normalized = hour < 12
          ? hour / 12
          : (24 - hour) / 12
        break
      }
      case 'fixed':
      default:
        return velocity.min
    }

    return Math.round(velocity.min + normalized * (velocity.max - velocity.min))
  }

  private calculateDuration(commit: CommitEvent, mapping: MappingConfig): number {
    const { duration } = mapping

    let normalized: number
    switch (duration.source) {
      case 'diff':
        const totalChanges = (commit.additions ?? 0) + (commit.deletions ?? 0)
        normalized = Math.min(totalChanges / 1000, 1)
        break
      case 'files':
        normalized = Math.min((commit.filesChanged ?? 1) / 20, 1)
        break
      case 'messageLength':
        normalized = Math.min((commit.message?.length ?? 50) / 200, 1)
        break
      case 'fixed':
      default:
        return duration.minMs
    }

    return Math.round(duration.minMs + normalized * (duration.maxMs - duration.minMs))
  }

  private generateMidi(notes: NoteEvent[], mapping: MappingConfig): string {
    const track = new MidiWriter.Track()

    track.setTempo(mapping.tempo.bpm, 0)

    if (mapping.instrument) {
      track.addEvent(
        new MidiWriter.ProgramChangeEvent({
          instrument: mapping.instrument.program
        })
      )
    }

    const ppq = 128
    const msPerBeat = 60000 / mapping.tempo.bpm
    const ticksPerMs = ppq / msPerBeat

    for (const note of notes) {
      const durationTicks = Math.max(1, Math.round(note.durationMs * ticksPerMs))
      const pitchName = this.midiNoteToPitch(note.pitch)

      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [pitchName] as unknown as MidiWriter.Pitch[],
          duration: `T${durationTicks}`,
          velocity: note.velocity
        })
      )
    }

    const write = new MidiWriter.Writer([track])
    return write.base64()
  }

  private midiNoteToPitch(midiNote: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midiNote / 12) - 1
    const noteIndex = midiNote % 12
    const noteName = notes[noteIndex] ?? 'C'
    return `${noteName}${octave}`
  }
}
