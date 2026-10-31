"use client"

import * as React from "react"
import { ArrowUpCircleIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Spinner } from "@/components/ui/spinner"

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "error"
type UpdateResult = { ok?: boolean; already?: boolean; version?: string | null; message?: string }
declare global {
  interface Window {
    chuckBot?: { update?: DesktopUpdateApi }
  }
}

type DesktopUpdateApi = {
  check: () => Promise<UpdateResult>
  download: () => Promise<UpdateResult>
  install: () => Promise<void>
  on: (channel: string, listener: (payload: { version?: string; percent?: number; message?: string }) => void) => () => void
}

export function DesktopUpdater({ version }: { version: string }) {
  const t = useTranslations("sidebar")
  const [state, setState] = React.useState<UpdateStatus>("checking")
  const [latest, setLatest] = React.useState<string>()
  const [progress, setProgress] = React.useState(0)
  const [message, setMessage] = React.useState<string>()
  const [api] = React.useState<DesktopUpdateApi | null>(() =>
    typeof window === "undefined" ? null : (window.chuckBot?.update ?? null)
  )

  React.useEffect(() => {
    const update = api
    if (!update) return
    const listeners = [
      update.on("update:available", (info) => { setLatest(info.version); setState("available") }),
      update.on("update:not-available", () => setState("idle")),
      update.on("update:progress", (info) => setProgress(Math.round(info.percent ?? 0))),
      update.on("update:downloaded", (info) => { setLatest(info.version); setState("downloaded") }),
      update.on("update:error", (error) => { setMessage(error.message); setState("error") }),
    ]
    update.check().then((result) => {
      if (result.ok === false) { setMessage(result.message); setState("error") }
    })
    return () => listeners.forEach((remove) => remove())
  }, [api])

  if (!api) {
    return <span className="rounded-sm border px-1.5 py-px font-mono text-[10px] text-muted-foreground">v{version}</span>
  }

  const click = async () => {
    if (state === "idle" || state === "error") {
      setMessage(undefined)
      setState("checking")
      const result = await api.check()
      if (result.ok === false) { setMessage(result.message); setState("error") }
    } else if (state === "available") {
      setState("downloading")
      const result = await api.download()
      if (result.ok === false) { setMessage(result.message); setState("error") }
    } else if (state === "downloaded") {
      await api.install()
    }
  }

  const label = state === "checking" ? t("checkingUpdate")
    : state === "available" ? t("downloadUpdate")
      : state === "downloading" ? `${progress}%`
        : state === "downloaded" ? t("restartUpdate")
          : state === "error" ? t("retryUpdate")
            : `v${version}`
  return (
    <button
      type="button"
      onClick={click}
      disabled={state === "checking" || state === "downloading"}
      title={message ?? (latest ? t("newVersion", { version: latest }) : t("checkUpdate"))}
      className="flex items-center gap-1 rounded-sm border px-1.5 py-px font-mono text-[10px] text-muted-foreground transition-colors hover:border-rigel/40 hover:text-rigel disabled:opacity-60"
    >
      {state === "checking" || state === "downloading" ? <Spinner className="size-2.5" /> : state !== "idle" && <ArrowUpCircleIcon className="size-2.5" />}
      {label}
    </button>
  )
}
