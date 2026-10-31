"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { isLocale, type Locale } from "@/lib/i18n/routing"

// Switch the UI language. The locale lives in the NEXT_LOCALE cookie (read by
// lib/i18n/request.ts); there is no URL prefix, so changing it only needs a
// cookie write + revalidate, no redirect.
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return
  const store = await cookies()
  store.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  revalidatePath("/", "layout")
}
