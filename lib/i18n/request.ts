import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { defaultLocale, isLocale } from "./routing"

// Locale comes from the NEXT_LOCALE cookie (set by the language switcher),
// with no URL prefix and no redirect. This keeps the route tree identical to
// upstream so merges stay clean.
export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get("NEXT_LOCALE")?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
