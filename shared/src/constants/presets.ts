import type { MappingConfig } from '../schema/mapping.js'

export const DEFAULT_PRESET: MappingConfig = {
  name: 'Default',
  tempo: {
    mode: 'fixed',
    bpm: 120
  },
  pitch: {
    source: 'sha',
    scale: 'pentatonic',
    rootNote: 60,
    octaveMin: 3,
    octaveMax: 6
  },
  duration: {
    source: 'files',
    minMs: 100,
    maxMs: 500
  },
  velocity: {
    source: 'additions',
    min: 50,
    max: 100
  },
  instrument: {
    program: 0,
    channel: 0
  }
}

export const CHILL_PRESET: MappingConfig = {
  name: 'Chill',
  tempo: {
    mode: 'fixed',
    bpm: 70
  },
  pitch: {
    source: 'hour',
    scale: 'major',
    rootNote: 48,
    octaveMin: 3,
    octaveMax: 5
  },
  duration: {
    source: 'messageLength',
    minMs: 300,
    maxMs: 1200
  },
  velocity: {
    source: 'timeOfDay',
    min: 30,
    max: 70
  },
  instrument: {
    program: 4,
    channel: 0
  }
}

export const INTENSE_PRESET: MappingConfig = {
  name: 'Intense',
  tempo: {
    mode: 'fixed',
    bpm: 160
  },
  pitch: {
    source: 'sha',
    scale: 'minor',
    rootNote: 60,
    octaveMin: 2,
    octaveMax: 7
  },
  duration: {
    source: 'diff',
    minMs: 50,
    maxMs: 300
  },
  velocity: {
    source: 'deletions',
    min: 70,
    max: 127
  },
  instrument: {
    program: 30,
    channel: 0
  }
}

export const MINIMAL_PRESET: MappingConfig = {
  name: 'Minimal',
  tempo: {
    mode: 'fixed',
    bpm: 90
  },
  pitch: {
    source: 'author',
    scale: 'pentatonic',
    rootNote: 60,
    octaveMin: 4,
    octaveMax: 5
  },
  duration: {
    source: 'fixed',
    minMs: 200,
    maxMs: 200
  },
  velocity: {
    source: 'fixed',
    min: 60,
    max: 60
  },
  instrument: {
    program: 0,
    channel: 0
  }
}

export const AMBIENT_PRESET: MappingConfig = {
  name: 'Ambient',
  tempo: {
    mode: 'frequency',
    bpm: 60,
    windowDays: 7
  },
  pitch: {
    source: 'dayOfWeek',
    scale: 'dorian',
    rootNote: 48,
    octaveMin: 3,
    octaveMax: 5
  },
  duration: {
    source: 'messageLength',
    minMs: 500,
    maxMs: 2000
  },
  velocity: {
    source: 'timeOfDay',
    min: 20,
    max: 60
  },
  instrument: {
    program: 88,
    channel: 0
  }
}

export const PRESETS = {
  default: DEFAULT_PRESET,
  chill: CHILL_PRESET,
  intense: INTENSE_PRESET,
  minimal: MINIMAL_PRESET,
  ambient: AMBIENT_PRESET
} as const

export type PresetName = keyof typeof PRESETS
