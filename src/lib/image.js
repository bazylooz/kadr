import { getMessages } from './i18n'

export const FORMATS = {
  jpeg: {
    id: 'jpeg',
    label: 'JPG',
    mime: 'image/jpeg',
    ext: 'jpg',
    description: 'Najmniejsze pliki, uniwersalna zgodność.',
  },
  png: {
    id: 'png',
    label: 'PNG',
    mime: 'image/png',
    ext: 'png',
    description: 'Bezstratny, zachowuje przezroczystość.',
  },
  webp: {
    id: 'webp',
    label: 'WebP',
    mime: 'image/webp',
    ext: 'webp',
    description: 'Nowoczesny format — mniejszy niż JPG.',
  },
  pdf: {
    id: 'pdf',
    label: 'PDF',
    mime: 'application/pdf',
    ext: 'pdf',
    description: 'Zdjęcie na jednej stronie dopasowanej do kadru.',
  },
}

export const FORMAT_ORDER = ['jpeg', 'png', 'webp', 'pdf']

const MAX_SIDE = 12000
const MAX_PIXELS = 64_000_000
const TAU = Math.PI * 2

const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const SUPPORTED_EXT = /\.(jpe?g|png|webp)$/i

export function isSupportedImage(file) {
  if (!file) return false
  return SUPPORTED_TYPES.includes((file.type || '').toLowerCase()) || SUPPORTED_EXT.test(file.name || '')
}

export function loadImageFile(file, lang = 'pl') {
  const t = getMessages(lang).image
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        URL.revokeObjectURL(url)
        reject(new Error(t.readDimsError))
        return
      }
      resolve({
        element: img,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(t.readFileError))
    }
    img.src = url
  })
}

function limitPixels(w, h) {
  if (w * h <= MAX_PIXELS) return { w, h }
  const factor = Math.sqrt(MAX_PIXELS / (w * h))
  return {
    w: Math.max(16, Math.floor(w * factor)),
    h: Math.max(16, Math.floor(h * factor)),
  }
}

function clampInt(value, min, max, fallback) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function computeOutputSize(naturalW, naturalH, preset, customW, customH) {
  if (!naturalW || !naturalH) return { w: 1, h: 1 }

  if (preset === 'custom') {
    return limitPixels(
      clampInt(customW, 16, MAX_SIDE, naturalW),
      clampInt(customH, 16, MAX_SIDE, naturalH),
    )
  }

  if (preset === 'original') {
    return limitPixels(
      Math.min(naturalW, MAX_SIDE),
      Math.min(naturalH, MAX_SIDE),
    )
  }

  const target = Number(preset)
  if (!Number.isFinite(target) || target <= 0) return { w: naturalW, h: naturalH }

  const factor = Math.min(1, target / Math.max(naturalW, naturalH))
  return {
    w: Math.max(16, Math.round(naturalW * factor)),
    h: Math.max(16, Math.round(naturalH * factor)),
  }
}

function expandPoints(points, spacing) {
  if (!points.length) return []
  const out = [{ x: points[0].x, y: points[0].y }]
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const distance = Math.hypot(dx, dy)
    const steps = Math.max(1, Math.ceil(distance / Math.max(0.5, spacing)))
    for (let step = 1; step <= steps; step += 1) {
      out.push({ x: a.x + (dx * step) / steps, y: a.y + (dy * step) / steps })
    }
  }
  return out
}

let scratch = null

function getScratch(width, height) {
  if (!scratch) scratch = document.createElement('canvas')
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width
    scratch.height = height
  }
  const context = scratch.getContext('2d')
  if (!context) return null
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, width, height)
  context.filter = 'none'
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return context
}

function pixelateRegion(ctx, source, radius, region) {
  const canvas = ctx.canvas
  const block = Math.max(4, Math.round(radius * 0.42))

  let x0 = 0
  let y0 = 0
  let x1 = canvas.width
  let y1 = canvas.height

  if (region) {
    x0 = Math.max(0, Math.floor(region.x / block) * block)
    y0 = Math.max(0, Math.floor(region.y / block) * block)
    x1 = Math.min(canvas.width, Math.ceil(region.x1 / block) * block)
    y1 = Math.min(canvas.height, Math.ceil(region.y1 / block) * block)
  }

  const width = x1 - x0
  const height = y1 - y0
  if (width <= 0 || height <= 0) return

  const tinyW = Math.max(1, Math.round(width / block))
  const tinyH = Math.max(1, Math.round(height / block))
  const tiny = getScratch(tinyW, tinyH)
  if (!tiny) return

  tiny.drawImage(source, x0, y0, width, height, 0, 0, tinyW, tinyH)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(tiny.canvas, 0, 0, tinyW, tinyH, x0, y0, tinyW * block, tinyH * block)
  ctx.imageSmoothingEnabled = true
}

function blurRegion(ctx, source, radius, region) {
  const canvas = ctx.canvas
  const blur = Math.max(4, radius * 0.7)
  const pad = Math.ceil(blur * 3)

  let x0 = 0
  let y0 = 0
  let x1 = canvas.width
  let y1 = canvas.height

  if (region) {
    x0 = Math.max(0, Math.floor(region.x - pad))
    y0 = Math.max(0, Math.floor(region.y - pad))
    x1 = Math.min(canvas.width, Math.ceil(region.x1 + pad))
    y1 = Math.min(canvas.height, Math.ceil(region.y1 + pad))
  }

  const width = x1 - x0
  const height = y1 - y0
  if (width <= 0 || height <= 0) return

  const patch = getScratch(width, height)
  if (!patch) return

  patch.filter = `blur(${blur}px)`
  patch.drawImage(source, x0, y0, width, height, 0, 0, width, height)
  patch.filter = 'none'

  ctx.drawImage(patch.canvas, x0, y0)
}

/**
 * Maluje efekt cenzury dla podanego zestawu punktów (współrzędne canvasu).
 * `region` ogranicza obszar przetwarzania — pozwala odświeżać tylko fragment
 * canvasa podczas rysowania, zamiast przeliczać całe zdjęcie w każdej klatce.
 */
export function paintCensorDabs(ctx, { mode, radius, points, source = ctx.canvas, region = null }) {
  if (!points?.length) return

  const canBlur = typeof ctx.filter === 'string'
  const path = new Path2D()
  for (const point of points) {
    path.moveTo(point.x + radius, point.y)
    path.arc(point.x, point.y, radius, 0, TAU)
  }

  ctx.save()
  ctx.beginPath()
  ctx.clip(path)

  try {
    if (mode === 'blur' && canBlur) {
      blurRegion(ctx, source, radius, region)
    } else {
      pixelateRegion(ctx, source, radius, region)
    }
  } finally {
    ctx.filter = 'none'
    ctx.restore()
  }
}

export function applyCensorStrokes(ctx, strokes, scale = 1) {
  const source = ctx.canvas

  for (const stroke of strokes) {
    if (!stroke?.points?.length) continue

    const scaled = stroke.points.map((point) => ({
      x: point.x * scale,
      y: point.y * scale,
    }))
    const radius = Math.max(1.5, stroke.r * scale)
    const points = expandPoints(scaled, Math.max(1, radius * 0.3))

    paintCensorDabs(ctx, { mode: stroke.mode, radius, points, source })
  }
}

export function renderImage({ image, strokes = [], width, height, background = null, lang = 'pl' }) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(getMessages(lang).image.noCanvasError)

  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, w, h)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, w, h)

  if (strokes.length) {
    const naturalWidth = image.naturalWidth || image.width || w
    applyCensorStrokes(ctx, strokes, w / naturalWidth)
  }

  return canvas
}

export function canvasToPdf(canvas, quality) {
  return import('jspdf').then(({ jsPDF }) => {
    const w = canvas.width
    const h = canvas.height
    const pdf = new jsPDF({
      orientation: w >= h ? 'landscape' : 'portrait',
      unit: 'px',
      format: [w, h],
      hotfixes: ['px_scaling'],
      compress: true,
    })
    const jpeg = canvas.toDataURL('image/jpeg', Math.min(1, Math.max(0.1, quality / 100)))
    pdf.addImage(jpeg, 'JPEG', 0, 0, w, h, undefined, 'FAST')
    return pdf.output('blob')
  })
}

export function encodeCanvas(canvas, format, quality, lang = 'pl') {
  const definition = FORMATS[format] || FORMATS.jpeg

  if (format === 'pdf') return canvasToPdf(canvas, quality)

  return new Promise((resolve, reject) => {
    const isPng = format === 'png'
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error(getMessages(lang).image.encodeError(definition.label)))
          }
        },
        definition.mime,
        isPng ? undefined : Math.min(1, Math.max(0.1, quality / 100)),
      )
    } catch (error) {
      reject(error)
    }
  })
}

export function buildFileName(originalName, extension, lang = 'pl') {
  const fallback = getMessages(lang).image.defaultFileBase
  const base = (originalName || fallback)
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${base || fallback}-kadr.${extension}`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
