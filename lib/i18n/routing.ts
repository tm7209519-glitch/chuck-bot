// Chuck Bot ships Simplified Chinese first, with English as an option.
// We intentionally do NOT use next-intl's routing middleware: it would force
// every page into a [locale] segment, which conflicts with clean upstream
// merges. Instead the locale is read from a cookie (NEXT_LOCALE) in
// lib/i18n/request.ts, and there is no URL prefix or redirect.
export const locales = ["zh", "en"] as const
export const defaultLocale = "zh"

export type Locale = (typeof locales)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}
