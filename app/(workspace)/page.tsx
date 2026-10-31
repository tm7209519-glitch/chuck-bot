import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { ArrowRightIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Glyph, SquadGlyph } from "@/components/glyph"
import {
  NewAgentCard,
  NewSquadButton,
  StarterTeamButton,
  TemplateGrid,
} from "@/components/home/actions"
import { agentTemplates } from "@/lib/templates"
import { PRODUCT_SLUG } from "@/lib/project"
import { getNavigation, getSystemStatus } from "@/queries/workspace"
import { cn } from "@/lib/utils"

function Check({
  ok,
  name,
  detail,
  href,
  optional,
  configure,
}: {
  ok: boolean
  name: string
  detail: string
  href?: string
  optional?: boolean
  configure?: string
}) {
  return (
    <div className="flex items-baseline gap-3 py-0.5">
      <span
        className={cn(
          "w-12 shrink-0 text-center",
          ok ? "text-ok" : optional ? "text-faint" : "text-betelgeuse"
        )}
      >
        [{ok ? " 好 " : optional ? " -- " : "警告"}]
      </span>
      <span className="w-24 shrink-0 text-foreground">{name}</span>
      <span className="min-w-0 truncate text-muted-foreground">{detail}</span>
      {!ok && href && (
        <Link href={href} className="ml-auto shrink-0 text-rigel hover:underline">
          {configure}
        </Link>
      )}
    </div>
  )
}

function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="label-mono">{children}</h2>
      <span className="h-px flex-1 bg-hairline" />
      {aside}
    </div>
  )
}

export default async function Home() {
  const t = await getTranslations("home")
  const status = getSystemStatus()
  const nav = getNavigation()
  const hasAgents = nav.agents.length > 0
  const hour = new Date().getHours()
  const greeting =
    hour < 5
      ? t("greetingLate")
      : hour < 12
        ? t("greetingMorning")
        : hour < 18
          ? t("greetingAfternoon")
          : t("greetingEvening")

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-x-0 top-0 h-[460px]" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-3">
          <span className="label-mono">{t("overviewLabel")}</span>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
            {hasAgents ? t("agentsStandingBy", { greeting }) : t("noAgentsTitle")}
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {t("noAgentsSubtitle")}
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border bg-surface/70 shadow-[0_1px_0_0_var(--hairline)] backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground/10" />
              <span className="size-2.5 rounded-full bg-foreground/10" />
              <span className="size-2.5 rounded-full bg-foreground/10" />
            </span>
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
              {PRODUCT_SLUG} — {t("systemCheck")}
            </span>
            <span
              className={cn(
                "ml-auto font-mono text-[10.5px]",
                status.ready ? "text-ok" : "text-betelgeuse"
              )}
            >
              {status.ready ? t("ready") : t("setupNeeded")}
            </span>
          </div>
          <div className="flex flex-col px-4 py-3 font-mono text-[12px]">
            <Check
              ok
              name={t("database")}
              detail={t("sqliteDetail", { path: status.dbPath })}
            />
            <Check
              ok={!!status.defaultModel}
              name={t("model")}
              detail={
                status.defaultModel
                  ? t("modelDetail", {
                      model: status.defaultModel,
                      count: status.providers.length,
                    })
                  : t("noProvider")
              }
              href="/settings#providers"
              configure={t("configure")}
            />
            <Check
              ok={status.workstation}
              optional
              name={t("workstation")}
              detail={
                status.docker === "ready"
                  ? t("dockerReady")
                  : status.workstation
                    ? t("dockerStopped")
                    : t("dockerNotFound")
              }
              href="/settings#integrations"
              configure={t("configure")}
            />
            <Check
              ok={status.web}
              optional
              name={t("web")}
              detail={status.web ? t("webReady") : t("webNotConfigured")}
              href="/settings#integrations"
              configure={t("configure")}
            />
            <Check ok name={t("network")} detail={t("loopback")} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle
            aside={
              <span className="flex items-center gap-3 font-mono text-[10.5px] text-faint">
                {hasAgents && t("total", { count: nav.agents.length })}
                <Link href="/templates" className="text-rigel hover:underline">
                  {agentTemplates.length} {t("templates")} →
                </Link>
              </span>
            }
          >
            {t("agents")}
          </SectionTitle>
          {hasAgents ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nav.agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={
                    agent.latestThreadId
                      ? `/a/${agent.id}/${agent.latestThreadId}`
                      : `/a/${agent.id}`
                  }
                  className="group relative flex min-h-[132px] flex-col gap-3 rounded-xl border bg-surface/50 p-4 transition-colors hover:border-input hover:bg-surface"
                >
                  <div className="flex items-center gap-3">
                    <Glyph seed={agent.glyph} className="size-10" />
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-[14.5px] font-semibold">
                        {agent.name}
                      </span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {agent.role}
                      </span>
                    </div>
                    {agent.busy && (
                      <span className="ml-auto flex items-center gap-1.5 font-mono text-[10.5px] text-rigel">
                        <span className="size-1.5 animate-pulse-dot rounded-full bg-rigel text-rigel" />
                        {t("working")}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center gap-2 font-mono text-[10.5px] text-faint">
                    <span className="truncate">
                      {agent.model ?? status.defaultModel ?? t("noModel")}
                    </span>
                    <ArrowRightIcon className="ml-auto size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
              <NewAgentCard />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-rigel/25 bg-rigel/5 p-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[14px] font-semibold">{t("startWithTeam")}</span>
                  <span className="text-[12.5px] leading-relaxed text-muted-foreground">
                    {t("startWithTeamDesc")}
                  </span>
                </div>
                <StarterTeamButton className="shrink-0" />
              </div>
              <TemplateGrid ids={["altair", "polaris", "capella", "sirius"]} />
              <Link
                href="/templates"
                className="self-start font-mono text-[11.5px] text-rigel hover:underline"
              >
                {t("browseTemplates", { count: agentTemplates.length })}
              </Link>
            </div>
          )}
        </section>

        {hasAgents && (
          <section className="flex flex-col gap-4">
            <SectionTitle aside={<NewSquadButton disabled={nav.agents.length < 2} />}>
              {t("squads")}
            </SectionTitle>
            {nav.squads.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t("squadEmpty")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nav.squads.map((squad) => (
                  <Link
                    key={squad.id}
                    href={
                      squad.latestThreadId
                        ? `/s/${squad.id}/${squad.latestThreadId}`
                        : `/s/${squad.id}`
                    }
                    className="flex items-center gap-3 rounded-xl border bg-surface/50 p-4 transition-colors hover:border-input hover:bg-surface"
                  >
                    <SquadGlyph seeds={squad.glyphs} className="size-10" />
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-[14px] font-semibold">
                        {squad.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {t("agentsUnit", { count: squad.agentIds.length })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {nav.threads.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>{t("recentActivity")}</SectionTitle>
            <div className="divide-y rounded-xl border bg-surface/40">
              {nav.threads.slice(0, 6).map((thread) => {
                const agent = nav.agents.find((a) => a.id === thread.agentId)
                const squad = nav.squads.find((s) => s.id === thread.squadId)
                const href = agent
                  ? `/a/${agent.id}/${thread.id}`
                  : `/s/${squad?.id}/${thread.id}`
                return (
                  <Link
                    key={thread.id}
                    href={href}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    {agent ? (
                      <Glyph seed={agent.glyph} className="size-6" />
                    ) : (
                      <SquadGlyph seeds={squad?.glyphs ?? []} className="size-6" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-[13px] font-medium">
                        {thread.title ?? t("newThread")}
                      </span>
                      {thread.preview && (
                        <span className="truncate text-[12px] text-muted-foreground">
                          {thread.preview}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-faint">
                      {formatDistanceToNowStrict(new Date(thread.activeAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
