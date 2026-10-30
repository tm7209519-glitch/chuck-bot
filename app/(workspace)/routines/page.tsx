import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { RoutinesView } from "@/components/routines/routines-view"
import { getRoutines } from "@/queries/workspace"

export const metadata: Metadata = { title: "Routines" }

export default async function Page() {
  const t = await getTranslations("pages.routines")
  const routines = getRoutines()
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <span className="label-mono">
            {t("kicker", { count: routines.filter((r) => r.enabled).length })}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </header>
        <div className="flex flex-col gap-1.5 rounded-xl border border-dashed px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="label-mono">{"// keep it running"}</span>
          <p>
            You can also ask any agent in a chat: &ldquo;every weekday at 9, check…&rdquo;
            or &ldquo;tomorrow at 7, remind me…&rdquo;. To keep Xiryn working with no
            terminal or browser open, run{" "}
            <code className="rounded-sm bg-muted px-1 font-mono text-[11.5px] text-foreground">
              npm run background
            </code>{" "}
            in the Xiryn folder (add{" "}
            <code className="rounded-sm bg-muted px-1 font-mono text-[11.5px] text-foreground">
              -- login
            </code>{" "}
            to start it whenever you log in). With no tab open, your computer and Telegram
            tell you when a routine is done.
          </p>
        </div>
        <RoutinesView routines={routines} />
      </div>
    </div>
  )
}
