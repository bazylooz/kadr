import {
  Download,
  Fingerprint,
  Link2,
  Loader2,
  Lock,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Unlink,
} from 'lucide-react'
import { cx } from '../lib/cx'
import { areasLabel, formatBytes, formatDelta } from '../lib/format'
import { getMessages } from '../lib/i18n'
import { FORMATS, FORMAT_ORDER } from '../lib/image'
import { Slider, Switch } from './ui'

const PRESET_IDS = ['original', '1920', '1080', '800']

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-500/[0.08] text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-300">
        <Icon size={14} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[12.5px] font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="muted mt-0.5 text-[10px] leading-snug">{subtitle}</p>}
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange, onBlur, min = 16, max = 12000 }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="muted mb-1 block text-[9px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </span>
      <span className="relative block">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="field pr-7"
        />
        <span className="muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px]">
          px
        </span>
      </span>
    </label>
  )
}

export default function Sidebar({
  lang,
  image,
  quality,
  setQuality,
  format,
  setFormat,
  preset,
  setPreset,
  onPreset,
  customW,
  customH,
  setCustomW,
  setCustomH,
  aspectLocked,
  onToggleAspectLock,
  output,
  originalSize,
  estimate,
  strokes,
  onUndo,
  onClear,
  brushActive,
  setBrushActive,
  brushSize,
  setBrushSize,
  brushMode,
  setBrushMode,
  exporting,
  onExport,
}) {
  const messages = getMessages(lang)
  const t = messages.sidebar
  const formatDescriptions = messages.formats
  const delta = formatDelta(originalSize, estimate.size)
  const newSize = estimate.size
  const barRatio =
    newSize && originalSize ? Math.min(100, Math.max(2, (newSize / originalSize) * 100)) : 0
  const isPng = format === 'png'
  const isUpscale = output.w > image.width || output.h > image.height
  const formatDefinition = FORMATS[format]
  const sizeLabel = estimate.error
    ? '—'
    : estimate.size != null
      ? formatBytes(estimate.size, lang)
      : null

  return (
    <aside className="panel flex flex-col overflow-hidden lg:h-full lg:min-h-0">
      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        <section className="px-4 pt-4 pb-4">
          <SectionTitle
            icon={SlidersHorizontal}
            title={t.compressionTitle}
            subtitle={t.compressionSub}
          />

          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="quality-slider" className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
              {t.quality}
            </label>
            <span className="text-[11px] font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
              {quality}%
            </span>
          </div>
          <div className="mt-2">
            <Slider
              id="quality-slider"
              value={quality}
              min={10}
              max={100}
              step={1}
              onChange={setQuality}
              disabled={isPng}
              ariaLabel={t.qualityAria}
            />
          </div>
          <div className="muted mt-1 flex justify-between text-[9px]">
            <span>{t.smallerFile}</span>
            <span>{t.higherQuality}</span>
          </div>
          {isPng && (
            <p className="mt-2 rounded-lg bg-slate-100/80 px-2 py-1.5 text-[9.5px] leading-snug text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
              {t.pngNote}
            </p>
          )}

          <div className="hairline mt-3 rounded-xl border bg-slate-50/80 p-3 dark:bg-white/[0.025]">
            <div className="flex items-center justify-between gap-2">
              <span className="muted flex items-center gap-1 text-[9px] font-semibold tracking-[0.09em] uppercase">
                {estimate.pending && <Loader2 size={9} className="animate-spin" />}
                {t.estimatedSize}
              </span>
              {delta && !estimate.pending && !estimate.error && (
                <span
                  className={cx(
                    'rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums',
                    delta.smaller === false
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {delta.label}
                </span>
              )}
            </div>

            <div className="mt-1 flex min-h-7 items-baseline gap-1.5">
              {sizeLabel ? (
                <span
                  className={cx(
                    'text-[22px] leading-none font-semibold tracking-tight tabular-nums',
                    estimate.error ? 'muted' : 'text-slate-900 dark:text-white',
                    estimate.pending && 'opacity-55',
                  )}
                >
                  {sizeLabel}
                </span>
              ) : (
                <span className="muted flex items-center gap-1.5 text-[11px]">
                  <Loader2 size={12} className="animate-spin" />
                  {t.estimating}
                </span>
              )}
              {sizeLabel && !estimate.error && (
                <span className="muted text-[10px]">
                  {t.fromOriginal(formatBytes(originalSize, lang))}
                </span>
              )}
            </div>

            {estimate.error ? (
              <p className="mt-2 text-[9.5px] leading-snug text-rose-500 dark:text-rose-400">
                {estimate.error}
              </p>
            ) : (
              <div
                className={cx(
                  'mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/90 transition-opacity dark:bg-white/[0.07]',
                  estimate.pending && 'opacity-60',
                )}
                title={
                  newSize
                    ? t.originalToNewTitle(formatBytes(originalSize, lang), formatBytes(newSize, lang))
                    : undefined
                }
              >
                <div
                  className={cx(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    delta?.smaller === false
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-indigo-500 to-emerald-400',
                  )}
                  style={{ width: `${barRatio}%` }}
                />
              </div>
            )}
            <p className="muted mt-2 text-[9px] leading-snug">{t.estimateDisclaimer}</p>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-medium text-slate-700 dark:text-slate-200">
                {t.quickSize}
              </span>
              <span className="muted text-[9px]">{t.longestSide}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PRESET_IDS.map((id) => {
                const item = t.presets[id]
                const active = preset === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onPreset(id)}
                    className={cx(
                      'preset border',
                      active
                        ? 'border-indigo-400/60 bg-indigo-500/[0.08] dark:border-indigo-400/40'
                        : 'hairline bg-white hover:border-slate-300 dark:bg-white/[0.02] dark:hover:border-white/20',
                    )}
                  >
                    <span
                      className={cx(
                        'block text-[10.5px] font-semibold',
                        active
                          ? 'text-indigo-600 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-200',
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="muted mt-0.5 block truncate text-[9px]">
                      {id === 'original' ? `${image.width} × ${image.height}` : item.sub}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-3 flex items-end gap-2">
            <NumberField
              label={t.width}
              value={customW}
              onChange={(value) => {
                setPreset('custom')
                setCustomW(value)
                const parsed = Number(value)
                if (aspectLocked && Number.isFinite(parsed) && parsed > 0) {
                  setCustomH(String(Math.max(16, Math.round((parsed * image.height) / image.width))))
                }
              }}
              onBlur={() => {
                if (!String(customW).trim()) setCustomW(String(output.w))
              }}
            />
            <button
              type="button"
              onClick={onToggleAspectLock}
              aria-pressed={aspectLocked}
              aria-label={aspectLocked ? t.unlockAspectAria : t.lockAspectAria}
              title={aspectLocked ? t.aspectLockedTitle : t.aspectUnlockedTitle}
              className={cx(
                'mb-px grid size-9 shrink-0 place-items-center rounded-lg border transition focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none',
                aspectLocked
                  ? 'border-indigo-400/40 bg-indigo-500/[0.08] text-indigo-600 dark:text-indigo-300'
                  : 'hairline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
              )}
            >
              {aspectLocked ? <Link2 size={14} /> : <Unlink size={14} />}
            </button>
            <NumberField
              label={t.height}
              value={customH}
              onChange={(value) => {
                setPreset('custom')
                setCustomH(value)
                const parsed = Number(value)
                if (aspectLocked && Number.isFinite(parsed) && parsed > 0) {
                  setCustomW(String(Math.max(16, Math.round((parsed * image.width) / image.height))))
                }
              }}
              onBlur={() => {
                if (!String(customH).trim()) setCustomH(String(output.h))
              }}
            />
          </div>

          <div className="muted mt-2 flex items-center justify-between gap-2 text-[9.5px] tabular-nums">
            <span>
              {t.result}{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {output.w} × {output.h} px
              </span>
            </span>
            {isUpscale ? (
              <span className="text-amber-600 dark:text-amber-400">{t.upscale}</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">{t.noUpscale}</span>
            )}
          </div>
        </section>

        <div className="hairline mx-4 border-t" />

        <section className="px-4 py-4">
          <SectionTitle icon={ScanFace} title={t.censorTitle} subtitle={t.censorSub} />

          <div className="hairline mt-3 flex items-center justify-between gap-3 rounded-xl border bg-slate-50/70 px-3 py-2.5 dark:bg-white/[0.02]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 dark:text-slate-100">
                {t.censorBrush}
                {brushActive && (
                  <span className="size-1.5 animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-400" />
                )}
              </div>
              <p className="muted mt-0.5 text-[9.5px] leading-snug">
                {brushActive ? t.censorBrushActive : t.censorBrushInactive}
              </p>
            </div>
            <Switch checked={brushActive} onChange={setBrushActive} label={t.censorSwitchAria} />
          </div>

          <div className="segmented mt-3 grid-cols-2">
            {[
              { id: 'pixelate', label: t.pixelate },
              { id: 'blur', label: t.blur },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setBrushMode(mode.id)}
                aria-pressed={brushMode === mode.id}
                className={cx(
                  'segmented-button',
                  brushMode === mode.id
                    ? 'segmented-button-active'
                    : 'hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-medium text-slate-700 dark:text-slate-200">
                {t.brushSize}
              </span>
              <span className="muted text-[10px] tabular-nums">{brushSize} px</span>
            </div>
            <div className="mt-1.5">
              <Slider
                value={brushSize}
                min={12}
                max={120}
                step={2}
                onChange={setBrushSize}
                accent="#10b981"
                ariaLabel={t.brushSizeAria}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!strokes.length}
              className="ghost-button h-9"
              title={t.undoTitle}
            >
              <Undo2 size={13} />
              {t.undo}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={!strokes.length}
              className="ghost-button h-9"
              title={t.clearTitle}
            >
              <Trash2 size={13} />
              {t.clear}
            </button>
          </div>
          <div className="muted mt-2 flex items-center justify-between gap-2 text-[9px]">
            <span>{areasLabel(strokes.length, lang)}</span>
            <span>{t.escHint}</span>
          </div>
        </section>

        <div className="hairline mx-4 border-t" />

        <section className="px-4 py-4">
          <SectionTitle icon={Fingerprint} title={t.exifTitle} subtitle={t.exifSub} />

          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.055] p-3 dark:border-emerald-400/15 dark:bg-emerald-400/[0.05]">
            <div className="flex gap-2.5">
              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400"
              />
              <div className="min-w-0">
                <p className="text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {t.exifBodyBefore}
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {t.exifBodyBold}
                  </span>
                  {t.exifBodyAfter}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.exifTags.map((label) => (
                    <span
                      key={label}
                      className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="hairline shrink-0 border-t bg-white px-4 pt-3.5 pb-3.5 dark:bg-[#0b1016]">
        <div className="flex items-center justify-between gap-2">
          <span className="muted text-[9px] font-semibold tracking-[0.12em] uppercase">
            {t.exportFormat}
          </span>
          <span className="muted flex items-center gap-1 text-[9.5px] tabular-nums">
            {estimate.pending && <Loader2 size={9} className="animate-spin" />}
            {estimate.pending ? sizeLabel || t.estimating : estimate.error ? '—' : sizeLabel}
          </span>
        </div>

        <div className="segmented mt-2 grid-cols-4">
          {FORMAT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFormat(id)}
              aria-pressed={format === id}
              title={formatDescriptions[id]}
              className={cx(
                'segmented-button',
                format === id
                  ? 'segmented-button-active'
                  : 'hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              {FORMATS[id].label}
            </button>
          ))}
        </div>

        <p className="muted mt-1.5 min-h-3 text-[9px] leading-snug">{formatDescriptions[format]}</p>

        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:cursor-wait disabled:opacity-70 dark:focus-visible:ring-offset-[#0b1016]"
        >
          {exporting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              {t.preparingFile}
            </>
          ) : (
            <>
              <Download size={15} />
              {t.downloadBtn}
            </>
          )}
        </button>

        <div className="muted mt-2 flex items-center justify-between gap-2 text-[9px]">
          <span className="flex items-center gap-1">
            <Lock size={9} className="text-emerald-500 dark:text-emerald-400" />
            {t.localSaveNote}
          </span>
          <span className="tabular-nums">
            {output.w} × {output.h} px · {formatDefinition.label}
          </span>
        </div>
      </div>
    </aside>
  )
}
