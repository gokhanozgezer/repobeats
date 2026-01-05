export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function hashToRange(hash: number, min: number, max: number): number {
  return min + (hash % (max - min + 1))
}

export function anonymizeString(str: string): string {
  const hash = hashString(str)
  return `anon_${hash.toString(16).slice(0, 8)}`
}

export function sha7(fullSha: string): string {
  return fullSha.slice(0, 7)
}
