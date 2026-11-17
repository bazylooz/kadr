import { cx } from '../lib/cx'

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  accent = '#6366f1',
  ariaLabel,
  id,
}) {
  const percent = ((Number(value) - min) / (max - min)) * 100
  const background = `linear-gradient(to right, ${accent} 0%, ${accent} ${percent}%, var(--slider-track) ${percent}%, var(--slider-track) 100%)`

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      disabled={disabled}
      aria-label={ariaLabel}
      className="kadr-range"
      style={{ backgroundImage: background }}
    />
  )
}

export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:opacity-40 dark:focus-visible:ring-offset-[#0b1016]',
        checked
          ? 'border-indigo-400/40 bg-indigo-500 shadow-[0_0_16px_-2px_rgba(99,102,241,0.6)]'
          : 'border-slate-300/70 bg-slate-200 dark:border-white/10 dark:bg-white/[0.08]',
      )}
    >
      <span
        className={cx(
          'inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}
