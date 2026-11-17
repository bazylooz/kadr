import { Aperture, ImagePlus, Moon, Sun } from 'lucide-react'
import { cx } from '../lib/cx'
import { getMessages } from '../lib/i18n'

export default function Header({ theme, onToggleTheme, lang, onSetLang, hasImage, onReset }) {
  const t = getMessages(lang).header

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f5f6f8]/85 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#070a0f]/85">
      <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center gap-2.5 px-3 sm:gap-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/25">
            <Aperture size={18} className="text-white" strokeWidth={2.2} />
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/20 ring-inset" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
              kadr<span className="text-emerald-500 dark:text-emerald-400">.</span>
            </span>
            <span className="mt-1 hidden text-[9px] font-medium tracking-[0.18em] text-slate-500 uppercase sm:block dark:text-slate-400">
              {t.subtitle}
            </span>
          </span>
        </div>

        <div className="flex-1" />

        <div
          className="pill hidden min-w-0 border-emerald-600/15 bg-emerald-500/[0.07] py-1.5 text-emerald-700 sm:inline-flex dark:border-emerald-400/20 dark:bg-emerald-400/[0.07] dark:text-emerald-300"
          title={t.privacyFull}
        >
          <span className="hidden lg:inline">{t.privacyFull}</span>
          <span className="hidden sm:inline lg:hidden">{t.privacyShort}</span>
        </div>

        <span
          className="pill inline-flex border-emerald-600/15 bg-emerald-500/[0.07] py-1.5 text-[10px] text-emerald-700 sm:hidden dark:border-emerald-400/20 dark:bg-emerald-400/[0.07] dark:text-emerald-300"
          title={t.privacyFull}
        >
          {t.privacyMobile}
        </span>

        {hasImage && (
          <button
            type="button"
            onClick={onReset}
            className="ghost-button h-9 gap-1.5 px-2.5 sm:px-3"
            title={t.newImageTitle}
          >
            <ImagePlus size={14} />
            <span className="hidden md:inline">{t.newImage}</span>
          </button>
        )}

        <div
          role="group"
          aria-label={t.langAria}
          className="flex h-9 items-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]"
        >
          {['pl', 'en'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onSetLang(code)}
              aria-pressed={lang === code}
              className={cx(
                'h-7 rounded-lg px-2 text-[11px] font-semibold uppercase transition focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none',
                lang === code
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
              )}
            >
              {code}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className={cx(
            'icon-button size-9 rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm',
            'dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300',
          )}
          aria-label={theme === 'dark' ? t.lightModeAria : t.darkModeAria}
          title={theme === 'dark' ? t.lightModeTitle : t.darkModeTitle}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
