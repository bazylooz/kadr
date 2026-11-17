import { useCallback, useEffect, useState } from 'react'
import { getMessages } from '../lib/i18n'

const STORAGE_KEY = 'kadr-lang'

function readInitialLang() {
  if (typeof window === 'undefined') return 'pl'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'pl' || stored === 'en') return stored
  } catch {
    // ignore storage access errors
  }
  return 'pl'
}

export function useLang() {
  const [lang, setLang] = useState(readInitialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = getMessages(lang).pageTitle
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore storage access errors
    }
  }, [lang])

  const toggleLang = useCallback(() => {
    setLang((current) => (current === 'pl' ? 'en' : 'pl'))
  }, [])

  return { lang, setLang, toggleLang }
}
