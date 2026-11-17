import { useRef, useState } from 'react'
import { ClipboardPaste, FolderOpen, Loader2, Lock, UploadCloud } from 'lucide-react'
import { cx } from '../lib/cx'
import { getMessages } from '../lib/i18n'

function hasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

export default function Dropzone({ lang, onFile, onPaste, onError, busy }) {
  const inputRef = useRef(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const t = getMessages(lang).dropzone

  function openPicker() {
    if (busy) return
    inputRef.current?.click()
  }

  function handleDrop(event) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(event.dataTransfer?.files || [])
    const file = files[0]
    if (file) onFile(file)
    else onError?.(t.noFileError, 'error')
  }

  return (
    <div
      onClick={openPicker}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={handleDrop}
      className={cx(
        'group relative w-full cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-7 text-center transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f5f6f8] focus-visible:outline-none sm:p-10 dark:focus-visible:ring-offset-[#070a0f]',
        dragging
          ? 'scale-[1.005] border-indigo-400 bg-indigo-500/[0.06] shadow-2xl shadow-indigo-500/10 dark:bg-indigo-500/[0.08]'
          : 'border-slate-300/90 bg-white/80 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)] hover:border-indigo-300 hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.025] dark:shadow-none dark:hover:border-indigo-400/40 dark:hover:bg-white/[0.04]',
        busy && 'pointer-events-none opacity-80',
      )}
    >
      <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl transition-opacity group-hover:opacity-100 dark:bg-indigo-500/[0.14]" />
      <div className="pointer-events-none absolute -right-20 -bottom-24 size-56 rounded-full bg-emerald-500/[0.07] blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="relative grid size-16 place-items-center rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.14] to-emerald-500/[0.09] text-indigo-500 shadow-inner shadow-white/60 dark:border-white/10 dark:text-indigo-300 dark:shadow-none">
          {busy ? (
            <Loader2 size={26} className="animate-spin" strokeWidth={1.8} />
          ) : (
            <UploadCloud size={27} strokeWidth={1.8} />
          )}
          <span className="absolute inset-0 rounded-2xl ring-1 ring-white/40 ring-inset dark:ring-white/5" />
        </div>

        <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          {busy ? t.loadingTitle : t.title}
        </h2>
        <p className="muted mt-1 text-[13px]">{t.subtitle}</p>

        <div className="mt-5 flex w-full max-w-sm flex-col items-center justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              openPicker()
            }}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:opacity-60 sm:w-auto dark:focus-visible:ring-offset-[#0b1016]"
          >
            <FolderOpen size={15} />
            {t.chooseFile}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onPaste()
            }}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:outline-none disabled:opacity-60 sm:w-auto dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
          >
            <ClipboardPaste size={15} />
            {t.paste}
            <kbd className="ml-0.5 hidden rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-medium text-slate-400 sm:inline-block dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              Ctrl+V
            </kbd>
          </button>
        </div>

        <div className="muted mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px]">
          <span>JPG</span>
          <span className="size-0.5 rounded-full bg-current opacity-40" />
          <span>PNG</span>
          <span className="size-0.5 rounded-full bg-current opacity-40" />
          <span>WebP</span>
          <span className="size-0.5 rounded-full bg-current opacity-40" />
          <span className="inline-flex items-center gap-1">
            <Lock size={10} />
            {t.localNote}
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
