import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import PreviewPanel from './components/PreviewPanel'
import Sidebar from './components/Sidebar'
import Toasts from './components/Toasts'
import UploadScreen from './components/UploadScreen'
import { useLang } from './hooks/useLang'
import { useTheme } from './hooks/useTheme'
import { formatBytes } from './lib/format'
import { getMessages } from './lib/i18n'
import {
  FORMATS,
  buildFileName,
  computeOutputSize,
  encodeCanvas,
  isSupportedImage,
  loadImageFile,
  renderImage,
} from './lib/image'
import { fileNameFromPath, saveBlob } from './lib/save'
import {
  estimateNative,
  exportNative,
  isDesktopApp,
  registerNativeImage,
  renderPayload,
} from './lib/native'

function clipboardFileName(file, lang) {
  const extension = (file.type?.split('/')[1] || 'png').replace('jpeg', 'jpg')
  const name = (file.name || '').trim()
  const generic = !name || /^(image|blob)\.(png|jpe?g|webp)$/i.test(name)
  const base = getMessages(lang).image.pastedFileBase
  return generic ? `${base}.${extension}` : name
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang } = useLang()

  const [image, setImage] = useState(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [quality, setQuality] = useState(82)
  const [format, setFormat] = useState('jpeg')
  const [preset, setPreset] = useState('original')
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [aspectLocked, setAspectLocked] = useState(true)
  const [strokes, setStrokes] = useState([])
  const [brushActive, setBrushActive] = useState(false)
  const [brushSize, setBrushSize] = useState(40)
  const [brushMode, setBrushMode] = useState('pixelate')
  const [estimate, setEstimate] = useState({ size: null, pending: false, error: null })
  const [nativeId, setNativeId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [toasts, setToasts] = useState([])

  const currentImageRef = useRef(null)
  const estimateTokenRef = useRef(0)

  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback((message, kind = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((list) => [...list.slice(-2), { id, message, kind }])
    window.setTimeout(() => {
      setToasts((list) => list.filter((toast) => toast.id !== id))
    }, 4600)
  }, [])

  useEffect(() => {
    currentImageRef.current = image
  }, [image])

  useEffect(() => {
    if (image) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [image])

  useEffect(
    () => () => {
      if (currentImageRef.current?.url) URL.revokeObjectURL(currentImageRef.current.url)
    },
    [],
  )

  const loadFile = useCallback(
    async (file, options = {}) => {
      const t = getMessages(lang)
      if (!file) return
      if (!isSupportedImage(file)) {
        pushToast(t.toasts.unsupported, 'error')
        return
      }

      setLoadingImage(true)
      try {
        const loaded = await loadImageFile(file, lang)
        if (currentImageRef.current?.url) {
          URL.revokeObjectURL(currentImageRef.current.url)
        }
        const next = {
          ...loaded,
          name: options.name || file.name || t.image.defaultFileBase,
          size: file.size,
          type: file.type,
        }
        currentImageRef.current = next
        setImage(next)
        setStrokes([])
        setBrushActive(false)
        setPreset('original')
        setCustomW(String(next.width))
        setCustomH(String(next.height))
        setAspectLocked(true)
        setQuality(82)
        setFormat('jpeg')
        setBrushMode('pixelate')
        setEstimate({ size: null, pending: false, error: null })

        // W aplikacji desktopowej bajty trafiają do silnika obrazów w Ruście.
        setNativeId(null)
        if (isDesktopApp()) {
          try {
            setNativeId(await registerNativeImage(file))
          } catch (error) {
            setNativeId(null)
            pushToast(error?.message || t.toasts.loadError, 'error')
          }
        }

        if (options.toastMessage) pushToast(options.toastMessage, 'success')
      } catch (error) {
        pushToast(error?.message || t.toasts.loadError, 'error')
      } finally {
        setLoadingImage(false)
      }
    },
    [lang, pushToast],
  )

  const handleReset = useCallback(() => {
    estimateTokenRef.current += 1
    if (currentImageRef.current?.url) URL.revokeObjectURL(currentImageRef.current.url)
    currentImageRef.current = null
    setNativeId(null)
    setImage(null)
    setStrokes([])
    setBrushActive(false)
    setEstimate({ size: null, pending: false, error: null })
  }, [])

  const handlePasteFromClipboard = useCallback(async () => {
    const t = getMessages(lang)
    try {
      if (!navigator.clipboard?.read) throw new Error('clipboard unavailable')
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((entry) => entry.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        const extension = type.split('/')[1].replace('jpeg', 'jpg')
        const file = new File([blob], `${t.image.pastedFileBase}.${extension}`, { type })
        await loadFile(file, { toastMessage: t.toasts.pasted })
        return
      }
      pushToast(t.toasts.clipboardEmpty, 'info')
    } catch {
      pushToast(t.toasts.clipboardDenied, 'info')
    }
  }, [lang, loadFile, pushToast])

  useEffect(() => {
    function handlePaste(event) {
      const items = Array.from(event.clipboardData?.items || [])
      for (const item of items) {
        if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
        const file = item.getAsFile()
        if (!file) continue
        event.preventDefault()
        loadFile(file, {
          name: clipboardFileName(file, lang),
          toastMessage: getMessages(lang).toasts.pasted,
        })
        return
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [lang, loadFile])

  const output = useMemo(() => {
    if (!image) return { w: 0, h: 0 }
    return computeOutputSize(image.width, image.height, preset, customW, customH)
  }, [image, preset, customW, customH])

  useEffect(() => {
    if (!image) return undefined

    const token = estimateTokenRef.current + 1
    estimateTokenRef.current = token
    setEstimate((current) => ({ ...current, pending: true, error: null }))

    const background = format === 'jpeg' || format === 'pdf' ? '#ffffff' : null
    const delay = format === 'pdf' ? 420 : 300

    const timer = window.setTimeout(async () => {
      try {
        const size =
          nativeId != null
            ? await estimateNative(
                renderPayload({
                  nativeId,
                  width: output.w,
                  height: output.h,
                  format,
                  quality,
                  strokes,
                  lang,
                }),
              )
            : (
                await encodeCanvas(
                  renderImage({
                    image: image.element,
                    strokes,
                    width: output.w,
                    height: output.h,
                    background,
                    lang,
                  }),
                  format,
                  quality,
                  lang,
                )
              ).size

        if (estimateTokenRef.current === token) {
          setEstimate({ size, pending: false, error: null })
        }
      } catch (error) {
        if (estimateTokenRef.current === token) {
          setEstimate({
            size: null,
            pending: false,
            error: error?.message || getMessages(lang).toasts.estimateError,
          })
        }
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [image, nativeId, strokes, output.w, output.h, format, quality, lang])

  const handleAddStroke = useCallback((stroke) => {
    setStrokes((list) => [...list, stroke])
  }, [])

  const handleUndo = useCallback(() => {
    setStrokes((list) => list.slice(0, -1))
  }, [])

  const handleClearStrokes = useCallback(() => {
    setStrokes([])
  }, [])

  const handlePreset = useCallback(
    (next) => {
      setPreset(next)
      if (!image) return
      const dims = computeOutputSize(image.width, image.height, next, customW, customH)
      setCustomW(String(dims.w))
      setCustomH(String(dims.h))
    },
    [image, customW, customH],
  )

  const handleToggleAspectLock = useCallback(() => {
    if (!image) return
    if (!aspectLocked) {
      const width = Math.max(16, Math.round(Number(customW) || output.w || image.width))
      setCustomW(String(width))
      setCustomH(String(Math.max(16, Math.round((width * image.height) / image.width))))
      setPreset('custom')
      setAspectLocked(true)
    } else {
      setAspectLocked(false)
    }
  }, [aspectLocked, customW, image, output.w])

  const handleExport = useCallback(async () => {
    if (!image || exporting) return
    const messages = getMessages(lang)
    const t = messages.toasts
    const filename = buildFileName(image.name, FORMATS[format].ext, lang)
    setExporting(true)
    try {
      if (nativeId != null) {
        // Desktop: render i zapis w całości po stronie Rusta.
        const saved = await exportNative(
          renderPayload({
            nativeId,
            width: output.w,
            height: output.h,
            format,
            quality,
            strokes,
            lang,
          }),
          {
            fileName: filename,
            dialogTitle: messages.save.dialogTitle,
            filterName: messages.save.filters[FORMATS[format].ext] || messages.save.genericFilter,
          },
        )
        if (!saved) return
        const savedName = fileNameFromPath(saved.path) || filename
        pushToast(t.saved(savedName, formatBytes(saved.size, lang)), 'success')
        return
      }

      await new Promise((resolve) => window.setTimeout(resolve, 40))
      const background = format === 'jpeg' || format === 'pdf' ? '#ffffff' : null
      const canvas = renderImage({
        image: image.element,
        strokes,
        width: output.w,
        height: output.h,
        background,
        lang,
      })
      const blob = await encodeCanvas(canvas, format, quality, lang)
      const result = await saveBlob(blob, filename, lang)
      if (result.cancelled) return
      const savedName = fileNameFromPath(result.path) || filename
      pushToast(t.saved(savedName, formatBytes(blob.size, lang)), 'success')
    } catch (error) {
      pushToast(error?.message || t.exportError, 'error')
    } finally {
      setExporting(false)
    }
  }, [image, nativeId, exporting, format, strokes, output.w, output.h, quality, lang, pushToast])

  useEffect(() => {
    function handleKeyDown(event) {
      if (!image) return
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing) {
        if (strokes.length) {
          event.preventDefault()
          setStrokes((list) => list.slice(0, -1))
        }
      }

      if (event.key === 'Escape' && brushActive) {
        setBrushActive(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [image, strokes.length, brushActive])

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onSetLang={setLang}
        hasImage={Boolean(image)}
        onReset={handleReset}
      />

      {image ? (
        <main className="mx-auto w-full max-w-[1680px] flex-1 px-3 pt-3 pb-4 sm:px-4 lg:h-[calc(100dvh-4rem)] lg:flex-none">
          <div className="flex h-full flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_410px]">
            <PreviewPanel
              lang={lang}
              image={image}
              strokes={strokes}
              onAddStroke={handleAddStroke}
              outW={output.w}
              outH={output.h}
              brushActive={brushActive}
              brushSize={brushSize}
              brushMode={brushMode}
              onExitBrush={() => setBrushActive(false)}
              onFile={loadFile}
            />

            <Sidebar
              lang={lang}
              image={image}
              quality={quality}
              setQuality={setQuality}
              format={format}
              setFormat={setFormat}
              preset={preset}
              setPreset={setPreset}
              onPreset={handlePreset}
              customW={customW}
              customH={customH}
              setCustomW={setCustomW}
              setCustomH={setCustomH}
              aspectLocked={aspectLocked}
              onToggleAspectLock={handleToggleAspectLock}
              output={output}
              originalSize={image.size}
              estimate={estimate}
              strokes={strokes}
              onUndo={handleUndo}
              onClear={handleClearStrokes}
              brushActive={brushActive}
              setBrushActive={setBrushActive}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              brushMode={brushMode}
              setBrushMode={setBrushMode}
              exporting={exporting}
              onExport={handleExport}
            />
          </div>
        </main>
      ) : (
        <UploadScreen
          lang={lang}
          onFile={loadFile}
          onPaste={handlePasteFromClipboard}
          onError={pushToast}
          busy={loadingImage}
        />
      )}

      <Toasts lang={lang} toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
