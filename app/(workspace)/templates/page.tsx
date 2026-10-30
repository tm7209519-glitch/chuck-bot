import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { TemplateGallery } from "@/components/templates/gallery"
import { agentTemplates, squadTemplates } from "@/lib/templates"

export const metadata: Metadata = { title: "Templates" }

export default async function Page() {
  const t = await getTranslations("pages.templates")
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <span className="label-mono">
            {t("kicker", {
              agents: agentTemplates.length,
              squads: squadTemplates.length,
            })}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </header>
        <TemplateGallery />
      </div>
    </div>
  )
}
