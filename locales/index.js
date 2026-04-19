import enMessages from './en.json' with { type: 'json' }
import jaMessages from './ja.json' with { type: 'json' }

const LOCALE_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
}

const normalizeLocaleTag = (value) => {
  if (value === undefined || value === null) return ''
  const token = String(value).trim().toLowerCase().replace(/_/g, '-')
  if (!token) return ''
  const dash = token.indexOf('-')
  return dash === -1 ? token : token.slice(0, dash)
}

const getFirstLocaleCandidate = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : ''
  }
  return value
}

export const resolveLocaleFromEnv = (env) => {
  const candidates = [
    env?.locale,
    getFirstLocaleCandidate(env?.preferredLocales),
    env?.lang,
    env?.language,
    env?.preferredLanguage,
    getFirstLocaleCandidate(env?.preferredLanguages),
  ]

  for (let i = 0; i < candidates.length; i++) {
    const locale = normalizeLocaleTag(candidates[i])
    if (locale && LOCALE_MESSAGES[locale]) return locale
  }

  return 'en'
}

export const getLocaleMessages = (locale) => {
  const normalized = normalizeLocaleTag(locale)
  return LOCALE_MESSAGES[normalized] || LOCALE_MESSAGES.en
}

