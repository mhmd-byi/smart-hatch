export function fmt(value: number | null | undefined, digits = 1) {
  return typeof value === 'number' ? value.toFixed(digits) : '—'
}

export function formatDuration(ms: number | null | undefined) {
  if (typeof ms !== 'number') return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}
