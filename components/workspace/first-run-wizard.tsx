"use client"

import * as React from "react"
import { ContainerIcon, PlayIcon, PlusIcon, ExternalLinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useWorkspace } from "@/components/workspace/context"
import { cn } from "@/lib/utils"

type DockerState =
  | { state: "checking" }
  | { state: "missing" }
  | { state: "stopped"; canStart: boolean; version?: string }
  | { state: "ready"; version?: string }
  | { state: "error"; message: string }

// A lightweight first-run guide shown when the app is running in the desktop
// shell and no agents exist yet. It walks through the two things a new user
// needs before anything works: Docker (for agent workstations) and a first
// agent. Not shown in the browser (no chuckBot bridge) or once an agent exists.
export function FirstRunWizard() {
  const { nav, openAgentDialog } = useWorkspace()
  const router = useRouter()
  // `window.chuckBot` is injected by the Electron preload before any page script
  // runs, but it's absent during SSR. useSyncExternalStore returns the server
  // snapshot (null) on the server and the real value on the client, so the
  // wizard appears on hydration without a flash or a setState-in-effect.
  const env = React.useSyncExternalStore(
    () => () => {},
    () => (typeof window === "undefined" ? null : (window.chuckBot?.env ?? null)),
    () => null
  )

  const [docker, setDocker] = React.useState<DockerState>({ state: "checking" })
  const [busy, setBusy] = React.useState<"start" | null>(null)
  const [dismissed, setDismissed] = React.useState(false)

  const hasAgents = nav.agents.length > 0

  // Only meaningful in the desktop shell and only before the first agent.
  const show = !!env && !hasAgents && !dismissed

  React.useEffect(() => {
    if (!env) return
    let cancelled = false
    env
      .docker()
      .then((result) => {
        if (cancelled) return
        setDocker(
          result.state === "missing"
            ? { state: "missing" }
            : result.state === "stopped"
              ? { state: "stopped", canStart: !!result.canStart, version: result.version }
              : result.state === "ready"
                ? { state: "ready", version: result.version }
                : { state: "error", message: result.message ?? "unknown" }
        )
      })
      .catch((error) => {
        if (!cancelled) setDocker({ state: "error", message: String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [env])

  if (!show) return null

  const start = async () => {
    if (!env) return
    setBusy("start")
    try {
      await env.startDocker()
      // Re-check after a moment; Docker Desktop takes a while to come up.
      setTimeout(async () => {
        const result = await env.docker()
        setDocker(
          result.state === "ready"
            ? { state: "ready", version: result.version }
            : result.state === "stopped"
              ? { state: "stopped", canStart: !!result.canStart, version: result.version }
              : { state: "missing" }
        )
        setBusy(null)
      }, 2000)
    } catch {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-xl border border-rigel/30 bg-rigel/5 p-5">
      <div className="flex items-center gap-2.5">
        <span className="text-[15px] font-semibold">欢迎使用 Chuck Bot</span>
        <span className="ml-auto font-mono text-[10.5px] text-faint">
          首次运行 · 两步就绪
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {/* Step 1 — Docker */}
        <div className="flex items-center gap-3 rounded-lg border bg-background/40 px-3.5 py-3">
          <ContainerIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-medium">Agent 的小电脑（Docker）</span>
            <span className="font-mono text-[11.5px] text-muted-foreground">
              {docker.state === "checking"
                ? "检查中…"
                : docker.state === "ready"
                  ? `就绪${docker.version ? ` · ${docker.version}` : ""}`
                  : docker.state === "missing"
                    ? "未安装"
                    : docker.state === "stopped"
                      ? "未运行"
                      : "检查失败"}
            </span>
          </div>
          {docker.state === "missing" && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => env?.openExternal("https://www.docker.com/products/docker-desktop/")}
            >
              下载 Docker <ExternalLinkIcon className="size-3" />
            </Button>
          )}
          {docker.state === "stopped" && docker.canStart && (
            <Button size="xs" variant="secondary" disabled={!!busy} onClick={start}>
              {busy === "start" ? <Spinner className="size-3" /> : <PlayIcon className="size-3" />}
              启动
            </Button>
          )}
          {docker.state === "ready" && (
            <span className="font-mono text-[11px] text-ok">✓</span>
          )}
        </div>

        {/* Step 2 — first agent */}
        <div className="flex items-center gap-3 rounded-lg border bg-background/40 px-3.5 py-3">
          <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-medium">创建第一个 Agent</span>
            <span className="text-[12px] text-muted-foreground">
              每个 Agent 都有自己的小电脑和记忆，你可以给它指派任何任务。
            </span>
          </div>
          <Button size="xs" onClick={() => openAgentDialog()}>
            创建 Agent
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          跳过，稍后设置
        </button>
        <button
          type="button"
          onClick={() => router.push("/settings#integrations")}
          className={cn(
            "font-mono text-[11px] text-muted-foreground hover:text-foreground",
            "flex items-center gap-1"
          )}
        >
          在设置里查看全部 <ExternalLinkIcon className="size-3" />
        </button>
      </div>
    </section>
  )
}
