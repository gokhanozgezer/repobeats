export function msToTicks(ms: number, bpm: number, ppq: number = 480): number {
  const msPerBeat = 60000 / bpm
  const beats = ms / msPerBeat
  return Math.round(beats * ppq)
}

export function ticksToMs(ticks: number, bpm: number, ppq: number = 480): number {
  const msPerBeat = 60000 / bpm
  const beats = ticks / ppq
  return Math.round(beats * msPerBeat)
}

export function getHourOfDay(timestamp: number): number {
  return new Date(timestamp).getHours()
}

export function getDayOfWeek(timestamp: number): number {
  return new Date(timestamp).getDay()
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function parseGitDate(dateStr: string): number {
  return new Date(dateStr).getTime()
}

export function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
