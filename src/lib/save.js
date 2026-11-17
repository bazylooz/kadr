import { getMessages } from './i18n'
import { downloadBlob } from './image'

export function isDesktopApp() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

/**
 * Zapisuje blob jako plik.
 *
 * W przeglądarce korzysta ze zwykłego pobierania (anchor + blob URL).
 * W aplikacji desktopowej (Tauri/WebView2) otwiera natywne okno zapisu
 * i zapisuje bajty bezpośrednio na dysku — dzięki temu eksport PDF działa
 * niezależnie od polityki pobierania WebView2.
 */
export async function saveBlob(blob, filename, lang = 'pl') {
  if (!isDesktopApp()) {
    downloadBlob(blob, filename)
    return { saved: true, cancelled: false, path: null, native: false }
  }

  const [{ save }, { invoke }, pathApi] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/api/core'),
    import('@tauri-apps/api/path'),
  ])

  const extension = filename.split('.').pop()?.toLowerCase() || 'bin'
  let defaultPath = filename

  try {
    defaultPath = await pathApi.join(await pathApi.downloadDir(), filename)
  } catch {
    // brak dostępu do katalogu Pobrane — użyj samej nazwy pliku
  }

  const t = getMessages(lang).save
  const target = await save({
    title: t.dialogTitle,
    defaultPath,
    filters: [{ name: t.filters[extension] || t.genericFilter, extensions: [extension] }],
  })

  if (!target) {
    return { saved: false, cancelled: true, path: null, native: true }
  }

  const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()))
  await invoke('write_file', { path: target, bytes })

  return { saved: true, cancelled: false, path: target, native: true }
}

export function fileNameFromPath(path) {
  if (!path) return null
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || null
}
