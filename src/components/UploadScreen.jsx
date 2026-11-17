import { FileText, Gauge, Scaling, ScanFace, ShieldCheck, Sparkles } from 'lucide-react'
import { getMessages } from '../lib/i18n'
import Dropzone from './Dropzone'

export default function UploadScreen({ lang, onFile, onPaste, onError, busy }) {
  const t = getMessages(lang).upload
  const features = [
    { icon: Gauge, label: t.features.compress },
    { icon: Scaling, label: t.features.resize },
    { icon: ScanFace, label: t.features.censor },
    { icon: FileText, label: t.features.pdf },
  ]

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-220px] left-1/2 h-[480px] w-[52rem] max-w-[150vw] -translate-x-1/2 rounded-full bg-indigo-500/[0.09] blur-[120px] dark:bg-indigo-500/[0.15]" />
        <div className="absolute top-[230px] right-[4%] size-72 rounded-full bg-emerald-400/[0.07] blur-[110px]" />
        <div className="absolute top-[120px] left-[2%] size-56 rounded-full bg-sky-400/[0.05] blur-[100px]" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
        <div className="animate-fade-up flex flex-col items-center text-center">
          <span className="pill border-slate-200/80 bg-white/70 text-slate-500 shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400">
            <Sparkles size={11} className="text-indigo-500 dark:text-indigo-400" />
            {t.badge}
          </span>

          <h1 className="mt-5 max-w-3xl text-[2.15rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance text-slate-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
            {t.headingStart}{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 bg-clip-text text-transparent dark:from-indigo-400 dark:via-sky-300 dark:to-emerald-300">
              {t.headingAccent}
            </span>
          </h1>

          <p className="muted mt-4 max-w-xl text-[14px] leading-relaxed text-balance sm:text-[15px]">
            {t.lead}
          </p>
        </div>

        <div className="animate-fade-up mt-8 [animation-delay:80ms]">
          <Dropzone lang={lang} onFile={onFile} onPaste={onPaste} onError={onError} busy={busy} />
        </div>

        <div className="animate-fade-up mt-5 grid grid-cols-2 gap-2 [animation-delay:160ms] sm:grid-cols-4">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 backdrop-blur dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-500/[0.08] text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-300">
                <Icon size={14} strokeWidth={2} />
              </span>
              <span className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300">
                {label}
              </span>
            </div>
          ))}
        </div>

        <p className="animate-fade-up muted mt-7 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[11px] [animation-delay:220ms]">
          <ShieldCheck size={12} className="text-emerald-500 dark:text-emerald-400" />
          {t.footer}
        </p>
      </div>
    </main>
  )
}
