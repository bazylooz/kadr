const plNumber = new Intl.NumberFormat('pl-PL')

export function formatNumber(value) {
  return plNumber.format(value)
}

export function formatBytes(bytes, lang = 'pl') {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`

  const sep = lang === 'en' ? '.' : ','
  const kb = bytes / 1024
  if (kb < 1024) {
    const rounded = kb >= 100 ? Math.round(kb) : Number(kb.toFixed(kb >= 10 ? 0 : 1))
    return `${String(rounded).replace('.', sep)} KB`
  }

  const mb = kb / 1024
  if (mb < 100) return `${mb.toFixed(1).replace('.', sep)} MB`
  return `${Math.round(mb)} MB`
}

export function formatDelta(originalSize, newSize) {
  if (!originalSize || !newSize || originalSize <= 0) return null
  const delta = Math.round((newSize / originalSize - 1) * 100)
  if (delta === 0) return { value: delta, label: '0%', smaller: null }
  const label = delta < 0 ? `−${Math.abs(delta)}%` : `+${delta}%`
  return { value: delta, label, smaller: delta < 0 }
}

export function areasLabel(count, lang = 'pl') {
  if (lang === 'en') {
    if (count === 0) return 'no strokes'
    if (count === 1) return '1 area'
    return `${count} areas`
  }
  if (count === 0) return 'brak zamalowań'
  if (count === 1) return '1 obszar'
  if (count >= 2 && count <= 4) return `${count} obszary`
  return `${count} obszarów`
}
