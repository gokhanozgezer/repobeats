export const SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10]
} as const

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export const MIDI_PROGRAMS = {
  acousticGrandPiano: 0,
  electricPiano: 4,
  harpsichord: 6,
  vibraphone: 11,
  marimba: 12,
  organ: 19,
  acousticGuitar: 24,
  electricGuitar: 26,
  electricBass: 33,
  violin: 40,
  strings: 48,
  synthStrings: 50,
  choir: 52,
  synthLead: 80,
  synthPad: 88,
  synthBass: 38
} as const

export function midiNoteToName(note: number): string {
  const octave = Math.floor(note / 12) - 1
  const noteIndex = note % 12
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

export function getNoteInScale(
  value: number,
  scale: keyof typeof SCALES,
  rootNote: number,
  octaveMin: number,
  octaveMax: number
): number {
  const scaleNotes = SCALES[scale]
  const octaveRange = octaveMax - octaveMin + 1
  const totalNotes = scaleNotes.length * octaveRange

  const noteIndex = Math.abs(value) % totalNotes
  const octaveOffset = Math.floor(noteIndex / scaleNotes.length)
  const scaleIndex = noteIndex % scaleNotes.length

  const baseOctave = (octaveMin + 1) * 12
  const scaleNote = scaleNotes[scaleIndex] ?? 0
  return baseOctave + (octaveOffset * 12) + scaleNote + (rootNote % 12)
}
