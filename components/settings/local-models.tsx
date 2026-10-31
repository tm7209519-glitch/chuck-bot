"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  CpuIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PlayIcon,
  PlugIcon,
} from "lucide-react"

import {
  connectLocalModels,
  downloadLocalModel,
  localModelsPanel,
  startLocalModels,
  chooseLocalModel,
  type LocalModelsPanel,
} from "@/actions/ollama"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useWorkspace } from "@/components/workspace/context"
import { cn } from "@/lib/utils"

function size(bytes: number) {
  const gb = bytes / 1024 ** 3
  return gb >= 1
    ? `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`
    : `${Math.round(bytes / 1024 ** 2)} MB`
}

function reason(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

// Ollama tags "name" and "name:latest" are the same model
function same(a: string, b: string) {
  const full = (name: string) => (name.includes(":") ? name : `${name}:latest`)
  return full(a) === full(b)
}

function PullProgress({ pull }: { pull: LocalModelsPanel["pulls"][number] }) {
  if (pull.state === "failed") {
    return (
      <p className="font-mono text-[11px] break-all text-destructive">{pull.error}</p>
    )
  }
  if (pull.state !== "pulling") return null
  const percent = pull.total ? Math.min(100, (pull.completed / pull.total) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-rigel transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-[10.5px] text-muted-foreground">
        {pull.status}
        {pull.total ? ` · ${size(pull.completed)} of ${size(pull.total)}` : ""}
      </span>
    </div>
  )
}

export function LocalModelsCard() {
  const router = useRouter()
  const { status } = useWorkspace()
  const [panel, setPanel] = React.useState<LocalModelsPanel | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [custom, setCustom] = React.useState("")

  const refresh = React.useCallback(async () => {
    try {
      setPanel(await localModelsPanel())
    } catch (error) {
      toast.add({
        type: "error",
        title: "无法连接 Ollama",
        description: reason(error),
      })
    }
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  // Follow downloads while they run, and refresh the model pickers when one
  // finishes
  const pulling =
    panel?.pulls.filter((p) => p.state === "pulling").map((p) => p.model) ?? []
  const pullingKey = pulling.join(",")
  React.useEffect(() => {
    if (!pullingKey) return
    const timer = setInterval(refresh, 1500)
    return () => {
      clearInterval(timer)
      router.refresh()
    }
  }, [pullingKey, refresh, router])

  const act = async (key: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(key)
    try {
      await action()
      if (done) toast.add({ type: "success", title: done })
      await refresh()
      router.refresh()
    } catch (error) {
      toast.add({
        type: "error",
        title: "出错了",
        description: reason(error),
      })
    } finally {
      setBusy(null)
    }
  }

  const download = async (model: string) => {
    // Shown at once; the real progress follows within a second or two
    setPanel(
      (current) =>
        current && {
          ...current,
          pulls: [
            ...current.pulls.filter((p) => !same(p.model, model)),
            { model, state: "pulling", status: "starting", completed: 0, total: 0 },
          ],
        }
    )
    try {
      setPanel(await downloadLocalModel(model))
    } catch (error) {
      toast.add({
        type: "error",
        title: "无法下载",
        description: reason(error),
      })
      await refresh()
    }
  }

  const isDefault = (model: string) => same(status.defaultModel ?? "", `ollama/${model}`)
  const installed = panel?.models ?? []
  const has = (model: string) => installed.some((m) => same(m.name, model))
  const pullFor = (model: string) => panel?.pulls.find((p) => same(p.model, model))

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-surface/50 p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1.5 size-1.5 shrink-0 rounded-full",
            !panel
              ? "bg-faint/50"
              : panel.running
                ? panel.connected
                  ? "bg-ok"
                  : "bg-warn"
                : "bg-faint/50"
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">本地模型</span>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            通过 Ollama 在这台电脑上运行的免费模型。你说的一切都不会离开本机，也无需付费。小模型更快，但能力不如托管模型。
          </p>
        </div>
        <a
          href="https://ollama.com/download"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          ollama <ExternalLinkIcon className="size-3" />
        </a>
      </div>

      <div className="flex flex-col divide-y rounded-lg border">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
          <CpuIcon className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-[12px]">
            {!panel
              ? "检查 Ollama…"
              : panel.running
                ? `ollama ${panel.version ?? ""} · ${installed.length} 个模型 · ${panel.memoryGb} GB 内存`
                : panel.installed
                  ? "Ollama 未运行"
                  : "未安装 Ollama"}
          </span>
          {panel?.running && !panel.connected && (
            <Button
              size="xs"
              variant="secondary"
              className="ml-auto"
              disabled={!!busy}
              onClick={() => act("connect", connectLocalModels, "Ollama 已连接")}
            >
              {busy === "connect" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlugIcon data-icon="inline-start" />
              )}
              在 Chuck Bot 中使用
            </Button>
          )}
          {panel?.running && panel.connected && (
            <span className="ml-auto font-mono text-[10.5px] text-ok">已连接</span>
          )}
          {panel && !panel.running && panel.installed && (
            <Button
              size="xs"
              variant="secondary"
              className="ml-auto"
              disabled={!!busy}
              onClick={() =>
                act("start", async () => {
                  const result = await startLocalModels()
                  if (!result.ok) throw new Error(result.error)
                })
              }
            >
              {busy === "start" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              启动 Ollama
            </Button>
          )}
        </div>

        {panel && !panel.installed && (
          <div className="flex flex-col gap-2 px-3 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            <p>
              一条命令即可安装 Ollama、下载适合这台电脑的模型并设为默认。在 Chuck Bot 所在目录的终端里：
            </p>
            <code className="rounded-md border bg-background/60 px-2.5 py-1.5 font-mono text-[11.5px] text-foreground">
              npm run setup:local
            </code>
            <p>
              或者从{" "}
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                ollama.com
              </a>{" "}
              安装后回到这里。
            </p>
          </div>
        )}

        {installed.map((model) => (
          <div
            key={model.name}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2"
          >
            <CheckIcon className="size-3.5 text-ok" />
            <span className="font-mono text-[12px]">{model.name}</span>
            <span className="font-mono text-[10.5px] text-faint">
              {[model.parameters, size(model.size)].filter(Boolean).join(" · ")}
            </span>
            {isDefault(model.name) ? (
              <span className="ml-auto rounded-sm border border-rigel/30 px-1.5 py-px font-mono text-[10px] text-rigel">
                default
              </span>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                className="ml-auto"
                disabled={!!busy}
                onClick={() =>
                  act(
                    `use:${model.name}`,
                    () => chooseLocalModel(model.name),
                    `${model.name} 现为默认`
                  )
                }
              >
                {busy === `use:${model.name}` && <Spinner data-icon="inline-start" />}
                设为默认
              </Button>
            )}
          </div>
        ))}
      </div>

      {panel?.running && (
        <div className="flex flex-col gap-2">
          <span className="label-mono">下载</span>
          <div className="flex flex-col divide-y rounded-lg border">
            {panel.recommended.map((model) => {
              const pull = pullFor(model.model)
              const fits = model.minMemory <= panel.memoryGb
              return (
                <div key={model.model} className="flex flex-col gap-1.5 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-mono text-[12px]">{model.model}</span>
                    <span className="font-mono text-[10.5px] text-faint">
                      {model.size}
                    </span>
                    {model.model === panel.best && (
              <span className="rounded-sm border border-ok/30 px-1.5 py-px font-mono text-[10px] text-ok">
                默认
              </span>
                    )}
                    {!fits && (
                      <span className="font-mono text-[10px] text-warn">
                        需要 {model.minMemory} GB+
                      </span>
                    )}
                    <span className="ml-auto">
                      {has(model.model) ? (
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          已下载
                        </span>
                      ) : pull?.state === "pulling" ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Button
                          size="xs"
                          variant={model.model === panel.best ? "secondary" : "ghost"}
                          disabled={!!busy}
                          onClick={() => download(model.model)}
                        >
                          <DownloadIcon data-icon="inline-start" />
                          {pull?.state === "failed" ? "重试" : "下载"}
                        </Button>
                      )}
                    </span>
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">
                    {model.note}
                  </span>
                  {pull && !has(model.model) && <PullProgress pull={pull} />}
                </div>
              )
            })}
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (custom.trim()) download(custom.trim()).then(() => setCustom(""))
            }}
          >
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="ollama.com/library 上的任意模型，例如 gemma4:12b"
              spellCheck={false}
              className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 font-mono text-[12px] outline-none placeholder:text-faint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 dark:bg-input/30"
            />
            <Button
              size="sm"
              variant="outline"
              type="submit"
              disabled={!custom.trim() || !!busy}
            >
              <DownloadIcon data-icon="inline-start" />
              下载
            </Button>
          </form>
          {panel.pulls
            .filter((p) => !panel.recommended.some((r) => same(r.model, p.model)))
            .filter((p) => p.state !== "done")
            .map((pull) => (
              <div key={pull.model} className="flex flex-col gap-1">
                <span className="font-mono text-[11px]">{pull.model}</span>
                <PullProgress pull={pull} />
              </div>
            ))}
          <p className="text-[11.5px] text-faint">
            Agent 需要能调用工具的模型。这些可以，而且还能看到它们桌面的截图。Chuck Bot 每次请求都向 Ollama 请求{" "}
            {Math.round(panel.context / 1024)}K 的上下文，因此 Agent 的指令总能完整容纳。
          </p>
        </div>
      )}
    </div>
  )
}
