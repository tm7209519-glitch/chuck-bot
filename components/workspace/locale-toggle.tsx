"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { LanguagesIcon } from "lucide-react"

import { setLocale } from "@/actions/locale"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Locale } from "@/lib/i18n/routing"

const NEXT: Record<Locale, Locale> = { zh: "en", en: "zh" }

// A small toggle in the sidebar footer that flips between Simplified Chinese
// and English. The locale is stored in the NEXT_LOCALE cookie (no URL prefix),
// so switching just writes the cookie and revalidates.
export function LocaleToggle() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const toggle = async () => {
    setPending(true)
    try {
      await setLocale(NEXT[locale])
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={toggle}
        disabled={pending}
        aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:opacity-60"
      >
        <LanguagesIcon className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="top">
        {locale === "zh" ? "English" : "中文"}
      </TooltipContent>
    </Tooltip>
  )
}
