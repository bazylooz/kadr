import { invoke } from '@tauri-apps/api/core'

export function isDesktopApp() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

/**
 * Wysyła bajty zdjęcia do silnika w Ruście i zwraca identyfikator.
 * Bajty lecą jako surowe ciało IPC (Uint8Array), bez konwersji do JSON.
 */
export function registerNativeImage(file) {
  return file.arrayBuffer().then((buffer) => invoke('load_image', new Uint8Array(buffer)))
}

/** Buduje payload zgodny z `RenderOptions` po stronie Rusta. */
export function renderPayload({ nativeId, width, height, format, quality, strokes, lang }) {
  return {
    id: nativeId,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    format,
    quality,
    lang,
    strokes: strokes.map((stroke) => ({
      mode: stroke.mode,
      r: stroke.r,
      points: stroke.points.map((point) => ({ x: point.x, y: point.y })),
    })),
  }
}

/** Rozmiar pliku wynikowego bez przesyłania bajtów do interfejsu. */
export function estimateNative(payload) {
  return invoke('estimate_image', { options: payload })
}

/** Render w Ruście + natywne okno „Zapisz jako”. Zwraca `null` przy anulowaniu. */
export function exportNative(payload, { fileName, dialogTitle, filterName }) {
  return invoke('export_image', {
    options: { ...payload, fileName, dialogTitle, filterName },
  })
}
