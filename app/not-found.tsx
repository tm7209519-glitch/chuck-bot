import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { LogoMark } from "@/components/brand"

export default async function NotFound() {
  const t = await getTranslations("pages.notFound")
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden p-6">
      <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <LogoMark className="size-12" />
        <div className="flex flex-col gap-1.5">
          <span className="label-mono">{t("kicker")}</span>
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-sm text-[13.5px] text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border bg-surface px-3 py-1.5 font-mono text-[12px] transition-colors hover:border-input"
        >
          {t("backToOverview")}
        </Link>
      </div>
    </div>
  )
}
