import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Eye, Image as ImageIcon, ScanFace, Upload, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cx } from '../lib/cx'
import { formatBytes } from '../lib/format'
import { getMessages } from '../lib/i18n'
import { paintCensorDabs, renderImage } from '../lib/image'

const MAX_PREVIEW_SIDE = 2000
const MIN_ZOOM = 0.1
const MAX_ZOOM = 24

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function eventHasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function pointsBounds(points, pad) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity

  for (const point of points) {
    if (point.x < x0) x0 = point.x
    if (point.y < y0) y0 = point.y
    if (point.x > x1) x1 = point.x
    if (point.y > y1) y1 = point.y
  }

  return { x: x0 - pad, y: y0 - pad, x1: x1 + pad, y1: y1 + pad }
}

export default function PreviewPanel({
  lang,
  image,
  strokes,
  onAddStroke,
  outW,
  outH,
  brushActive,
  brushSize,
  brushMode,
  onExitBrush,
  onFile,
}) {
  const t = getMessages(lang).preview
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const baseRef = useRef(null)
  const strokeRef = useRef(null)
  const liveRef = useRef(null)
  const cursorRef = useRef(null)
  const rectRef = useRef(null)
  const rafRef = useRef(0)
  const dragDepthRef = useRef(0)

  const [stage, setStage] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [showOriginal, setShowOriginal] = useState(false)
  const [dropActive, setDropActive] = useState(false)

  const previewScale = Math.min(1, MAX_PREVIEW_SIDE / Math.max(outW, outH))
  const pW = Math.max(1, Math.round(outW * previewScale))
  const pH = Math.max(1, Math.round(outH * previewScale))

  useLayoutEffect(() => {
    const element = stageRef.current
    if (!element) return undefined
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setStage({ w: rect.width, h: rect.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    strokeRef.current = null
    liveRef.current = null
    rectRef.current = null
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    setZoom(1)
    setShowOriginal(false)
    if (cursorRef.current) cursorRef.current.style.display = 'none'
  }, [image])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let rendered
    try {
      rendered = renderImage({
        image: image.element,
        strokes: showOriginal ? [] : strokes,
        width: pW,
        height: pH,
      })
    } catch {
      return
    }

    baseRef.current = rendered
    canvas.width = pW
    canvas.height = pH
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, pW, pH)
    context.drawImage(rendered, 0, 0)
  }, [image, strokes, pW, pH, showOriginal])

  useEffect(
    () => () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  useEffect(() => {
    if (brushActive) return undefined

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    paintLive()

    const stroke = strokeRef.current
    if (stroke) {
      strokeRef.current = null
      liveRef.current = null
      onAddStroke(stroke)
    }
    hideCursor()
    return undefined
  }, [brushActive, onAddStroke])

  useEffect(() => {
    if (!showOriginal) return undefined

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    const stroke = strokeRef.current
    if (stroke) {
      strokeRef.current = null
      liveRef.current = null
      onAddStroke(stroke)
    }
    hideCursor()

    const reset = () => setShowOriginal(false)
    window.addEventListener('blur', reset)
    return () => window.removeEventListener('blur', reset)
  }, [showOriginal, onAddStroke])

  const fitScale = useMemo(() => {
    const availableW = Math.max(stage.w - 48, 140)
    const availableH = Math.max(stage.h - 48, 140)
    return clamp(Math.min(availableW / pW, availableH / pH), 0.02, 1)
  }, [stage, pW, pH])

  const displayScale = fitScale * zoom
  const displayW = Math.max(1, Math.round(pW * displayScale))
  const displayH = Math.max(1, Math.round(pH * displayScale))
  const zoomPercent = Math.round(displayScale * 100)

  useEffect(() => {
    rectRef.current = null
  }, [displayW, displayH])

  function hideCursor() {
    if (cursorRef.current) cursorRef.current.style.display = 'none'
  }

  function moveCursor(event) {
    const element = cursorRef.current
    const canvas = canvasRef.current
    if (!element || !canvas) return

    let rect = rectRef.current
    if (!rect) {
      rect = canvas.getBoundingClientRect()
      rectRef.current = rect
    }

    element.style.display = 'block'
    element.style.transform = `translate3d(${event.clientX - rect.left}px, ${event.clientY - rect.top}px, 0) translate(-50%, -50%)`
  }

  function paintLive() {
    const live = liveRef.current
    const canvas = canvasRef.current
    const base = baseRef.current
    if (!live || !canvas || !base) return

    const { stroke } = live
    if (live.lastIndex >= stroke.points.length) return

    const scale = pW / image.width
    const slice = stroke.points.slice(live.lastIndex)
    live.lastIndex = stroke.points.length

    const context = canvas.getContext('2d')
    if (!context) return

    const points = slice.map((point) => ({ x: point.x * scale, y: point.y * scale }))
    const radius = stroke.r * scale

    paintCensorDabs(context, {
      mode: stroke.mode,
      radius,
      points,
      source: base,
      region: pointsBounds(points, radius + 2),
    })
  }

  function requestLive() {
    if (rafRef.current) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0
      paintLive()
    })
  }

  function toNatural(event, rect = rectRef.current) {
    const bounds = rect || canvasRef.current.getBoundingClientRect()
    const scaleX = image.width / bounds.width
    const scaleY = image.height / bounds.height
    return {
      x: clamp((event.clientX - bounds.left) * scaleX, 0, image.width),
      y: clamp((event.clientY - bounds.top) * scaleY, 0, image.height),
    }
  }

  function naturalBrushRadius(rect = rectRef.current) {
    const width = rect?.width || 0
    if (!width) return 8
    return Math.max(0.75, (brushSize / 2) * (image.width / width))
  }

  function handlePointerDown(event) {
    if (!brushActive || showOriginal) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()

    const canvas = canvasRef.current
    const base = baseRef.current
    if (!canvas || !base) return

    const context = canvas.getContext('2d')
    if (!context) return

    rectRef.current = canvas.getBoundingClientRect()
    context.clearRect(0, 0, pW, pH)
    context.drawImage(base, 0, 0)

    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // pointer capture is a best-effort enhancement
    }

    const stroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: brushMode,
      r: naturalBrushRadius(),
      points: [toNatural(event)],
    }

    strokeRef.current = stroke
    liveRef.current = { stroke, lastIndex: 0 }

    moveCursor(event)
    paintLive()
  }

  function handlePointerMove(event) {
    if (brushActive && !showOriginal) moveCursor(event)

    const stroke = strokeRef.current
    if (!stroke) return

    const point = toNatural(event)
    const last = stroke.points[stroke.points.length - 1]
    const dx = point.x - last.x
    const dy = point.y - last.y
    const distance = Math.hypot(dx, dy)
    if (distance < Math.max(0.6, stroke.r * 0.15)) return

    const spacing = Math.max(0.75, stroke.r * 0.3)
    const steps = Math.max(1, Math.ceil(distance / spacing))
    for (let index = 1; index <= steps; index += 1) {
      stroke.points.push({
        x: last.x + (dx * index) / steps,
        y: last.y + (dy * index) / steps,
      })
    }
    requestLive()
  }

  function finishStroke(event) {
    if (event?.pointerId != null) {
      try {
        canvasRef.current.releasePointerCapture(event.pointerId)
      } catch {
        // capture may already be released
      }
    }

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    paintLive()

    const stroke = strokeRef.current
    if (stroke) {
      strokeRef.current = null
      liveRef.current = null
      onAddStroke(stroke)
    }
    hideCursor()
  }

  function zoomTo(next) {
    setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM))
  }

  function handleDrop(event) {
    event.preventDefault()
    dragDepthRef.current = 0
    setDropActive(false)
    const file = Array.from(event.dataTransfer?.files || [])[0]
    if (file) onFile(file)
  }

  return (
    <section
      className="panel flex min-h-[52dvh] flex-col overflow-hidden lg:min-h-0"
      onDragEnter={(event) => {
        if (!eventHasFiles(event)) return
        event.preventDefault()
        dragDepthRef.current += 1
        setDropActive(true)
      }}
      onDragOver={(event) => {
        if (!eventHasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (!eventHasFiles(event)) return
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
        if (dragDepthRef.current === 0) setDropActive(false)
      }}
      onDrop={handleDrop}
    >
      <h2 className="sr-only">{t.heading}</h2>
      <div className="hairline flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
            <ImageIcon size={13} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span className="max-w-[50vw] truncate sm:max-w-[22rem]">{image.name}</span>
          </div>
          <div className="muted mt-0.5 text-[10.5px] tabular-nums">
            {image.width} × {image.height} px · {formatBytes(image.size, lang)}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hairline flex h-8 items-center rounded-lg border bg-white/70 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => zoomTo(zoom / 1.25)}
              className="icon-button size-7 rounded-md"
              aria-label={t.zoomOutAria}
              title={t.zoomOutTitle}
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-9 text-center text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() => zoomTo(zoom * 1.25)}
              className="icon-button size-7 rounded-md"
              aria-label={t.zoomInAria}
              title={t.zoomInTitle}
            >
              <ZoomIn size={13} />
            </button>
            <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-white/10" />
            <button
              type="button"
              onClick={() => zoomTo(1)}
              className="h-7 rounded-md px-2 text-[10px] font-medium text-slate-500 transition hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-white"
              title={t.fitTitle}
            >
              {t.fit}
            </button>
            <button
              type="button"
              onClick={() => zoomTo(1 / fitScale)}
              className="h-7 rounded-md px-2 text-[10px] font-medium text-slate-500 transition hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-white"
              title={t.oneToOneTitle}
            >
              1:1
            </button>
          </div>

          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault()
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                // ignore capture errors
              }
              setShowOriginal(true)
            }}
            onPointerUp={() => setShowOriginal(false)}
            onPointerCancel={() => setShowOriginal(false)}
            onLostPointerCapture={() => setShowOriginal(false)}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault()
                setShowOriginal(true)
              }
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') setShowOriginal(false)
            }}
            onBlur={() => setShowOriginal(false)}
            className={cx(
              'flex h-8 touch-none items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold transition select-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none',
              showOriginal
                ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-600 dark:border-indigo-400/40 dark:text-indigo-300'
                : 'hairline bg-white/70 text-slate-600 hover:text-slate-900 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white',
            )}
            title={t.holdTitle}
          >
            <Eye size={13} />
            <span className="hidden sm:inline">{t.holdPrefix}</span> {t.original}
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={stageRef}
          className="checker absolute inset-0 overflow-auto overscroll-contain"
          onScroll={() => {
            rectRef.current = null
          }}
        >
          <div className="flex min-h-full w-max min-w-full items-center justify-center p-6">
            <div className="relative shrink-0" style={{ width: displayW, height: displayH }}>
              <canvas
                ref={canvasRef}
                aria-label={t.canvasAria}
                className="block h-full w-full rounded-[3px] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/10 dark:ring-white/10"
                style={{
                  touchAction: brushActive ? 'none' : 'auto',
                  cursor: brushActive ? 'none' : 'default',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerCancel={finishStroke}
                onPointerEnter={(event) => {
                  rectRef.current = event.currentTarget.getBoundingClientRect()
                  if (brushActive && !showOriginal) moveCursor(event)
                }}
                onPointerLeave={() => {
                  if (!strokeRef.current) hideCursor()
                }}
                onContextMenu={(event) => event.preventDefault()}
              />

              {brushActive && !showOriginal && (
                <div
                  ref={cursorRef}
                  aria-hidden
                  className="pointer-events-none absolute z-10 rounded-full border border-white mix-blend-difference"
                  style={{
                    display: 'none',
                    width: brushSize,
                    height: brushSize,
                    left: 0,
                    top: 0,
                    transform: 'translate3d(0, 0, 0) translate(-50%, -50%)',
                  }}
                >
                  <span className="absolute top-1/2 left-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                </div>
              )}

              {showOriginal && (
                <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/75 px-2.5 py-1 text-[9.5px] font-semibold tracking-[0.12em] text-white uppercase shadow-lg backdrop-blur-md">
                  <Eye size={11} />
                  {t.originalBadge}
                </div>
              )}
            </div>
          </div>
        </div>

        {brushActive && !showOriginal && (
          <div className="animate-fade-in absolute top-3 left-1/2 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-indigo-500/25 bg-white/90 py-1.5 pr-1.5 pl-3 text-[10.5px] font-semibold whitespace-nowrap text-indigo-700 shadow-xl shadow-indigo-500/10 backdrop-blur-xl dark:border-indigo-400/25 dark:bg-[#0d131b]/90 dark:text-indigo-300">
            <ScanFace size={13} className="shrink-0" />
            <span className="truncate">{t.brushBanner}</span>
            <kbd className="hidden rounded border border-indigo-500/20 bg-indigo-500/[0.06] px-1.5 py-0.5 text-[9px] font-medium sm:inline">
              Esc
            </kbd>
            <button
              type="button"
              onClick={onExitBrush}
              className="grid size-5 shrink-0 place-items-center rounded-full text-indigo-500/70 transition hover:bg-indigo-500/10 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:hover:text-indigo-200"
              aria-label={t.exitBrushAria}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {dropActive && (
          <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-500/10 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-xl bg-[#0b1016] px-4 py-2.5 text-[12px] font-semibold text-white shadow-2xl ring-1 ring-white/10">
              <Upload size={15} className="text-indigo-300" />
              {t.dropReplace}
            </div>
          </div>
        )}
      </div>

      <div className="hairline flex h-8 shrink-0 items-center justify-between gap-3 border-t px-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          {outW} × {outH} px
        </span>
        <span className="truncate">
          {brushActive
            ? t.statusBrush
            : showOriginal
              ? t.statusOriginal
              : t.statusLive}
        </span>
      </div>
    </section>
  )
}
