import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cx } from '../lib/cx'
import { getMessages } from '../lib/i18n'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const STYLES = {
  success:
    'border-emerald-500/25 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-[#0d1a17] dark:text-emerald-200',
  error:
    'border-rose-500/25 bg-rose-50 text-rose-800 dark:border-rose-400/25 dark:bg-[#1c1015] dark:text-rose-200',
  info: 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-[#11161d] dark:text-slate-200',
}

const ICON_STYLES = {
  success: 'text-emerald-500 dark:text-emerald-400',
  error: 'text-rose-500 dark:text-rose-400',
  info: 'text-indigo-500 dark:text-indigo-400',
}

export default function Toasts({ lang, toasts, onDismiss }) {
  const closeAria = getMessages(lang).toasts.closeNotificationAria
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind] || Info
        return (
          <div
            key={toast.id}
            className={cx(
              'animate-toast-in pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-black/40',
              STYLES[toast.kind] || STYLES.info,
            )}
          >
            <Icon size={16} className={cx('mt-0.5 shrink-0', ICON_STYLES[toast.kind] || ICON_STYLES.info)} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="mt-0.5 shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current/30 focus-visible:outline-none"
              aria-label={closeAria}
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
