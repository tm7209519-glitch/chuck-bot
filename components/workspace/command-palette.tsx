"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ActivityIcon,
  AlarmClockIcon,
  BugIcon,
  HomeIcon,
  LayoutGridIcon,
  MailIcon,
  MessageSquareIcon,
  MoonIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import { useFeedbackContext } from "@/components/feedback/feedback-prompt"
import { Glyph, SquadGlyph } from "@/components/glyph"
import { useWorkspace } from "@/components/workspace/context"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { feedbackMailto, ISSUES_URL } from "@/lib/feedback"

export function CommandPalette() {
  const router = useRouter()
  const { nav, dialog, openPalette, closeDialog, openAgentDialog, openSquadDialog } =
    useWorkspace()
  const { resolvedTheme, setTheme } = useTheme()
  const feedback = useFeedbackContext()
  const open = dialog?.kind === "palette"

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        if (open) closeDialog()
        else openPalette()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, openPalette, closeDialog])

  const go = (href: string) => {
    closeDialog()
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? openPalette() : closeDialog())}
      title="跳转到"
      description="Agents、Squads、会话和操作"
      className="sm:max-w-lg"
    >
      <Command>
        <CommandInput placeholder="输入 Agent、Squad、会话或操作…" />
        <CommandList className="max-h-96">
          <CommandEmpty>无匹配结果。</CommandEmpty>
          {nav.agents.length > 0 && (
            <CommandGroup heading="Agents">
              {nav.agents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={`agent ${agent.name} ${agent.role}`}
                  onSelect={() =>
                    go(
                      agent.latestThreadId
                        ? `/a/${agent.id}/${agent.latestThreadId}`
                        : `/a/${agent.id}`
                    )
                  }
                >
                  <Glyph seed={agent.glyph} className="size-5" />
                  <span className="truncate">{agent.name}</span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {agent.role}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {nav.squads.length > 0 && (
            <CommandGroup heading="Squads">
              {nav.squads.map((squad) => (
                <CommandItem
                  key={squad.id}
                  value={`squad ${squad.name}`}
                  onSelect={() =>
                    go(
                      squad.latestThreadId
                        ? `/s/${squad.id}/${squad.latestThreadId}`
                        : `/s/${squad.id}`
                    )
                  }
                >
                  <SquadGlyph seeds={squad.glyphs} className="size-5" />
                  {squad.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {nav.threads.length > 0 && (
            <CommandGroup heading="会话">
              {nav.threads.slice(0, 20).map((thread) => (
                <CommandItem
                  key={thread.id}
                  value={`thread ${thread.title ?? ""} ${thread.preview ?? ""} ${thread.id}`}
                  onSelect={() =>
                    go(
                      thread.agentId
                        ? `/a/${thread.agentId}/${thread.id}`
                        : `/s/${thread.squadId}/${thread.id}`
                    )
                  }
                >
                  <MessageSquareIcon className="text-muted-foreground" />
                  <span className="truncate">{thread.title ?? "新会话"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="操作">
            <CommandItem value="new agent create" onSelect={() => openAgentDialog()}>
              <PlusIcon />
              新建 Agent
            </CommandItem>
            <CommandItem
              value="new squad create group"
              onSelect={() => openSquadDialog()}
            >
              <UsersIcon />
              新建 Squad
            </CommandItem>
            <CommandItem
              value="templates agents squads ready-made shopping travel jobs"
              onSelect={() => go("/templates")}
            >
              <LayoutGridIcon />
              模板
            </CommandItem>
            <CommandItem
              value="routines schedule daily every morning automatic recurring cron"
              onSelect={() => go("/routines")}
            >
              <AlarmClockIcon />
              例行任务
            </CommandItem>
            <CommandItem value="home overview" onSelect={() => go("/")}>
              <HomeIcon />
              概览
            </CommandItem>
            <CommandItem value="usage tokens ledger" onSelect={() => go("/usage")}>
              <ActivityIcon />
              用量
            </CommandItem>
            <CommandItem
              value="settings providers keys models"
              onSelect={() => go("/settings")}
            >
              <SettingsIcon />
              设置
            </CommandItem>
            <CommandItem
              value="send feedback email developer"
              onSelect={() => {
                closeDialog()
                window.location.href = feedbackMailto(feedback)
              }}
            >
              <MailIcon />
              发送反馈
            </CommandItem>
            <CommandItem
              value="report a bug issue github"
              onSelect={() => {
                closeDialog()
                window.open(ISSUES_URL, "_blank", "noopener")
              }}
            >
              <BugIcon />
              在 GitHub 上报 Bug
            </CommandItem>
            <CommandItem
              value="toggle theme dark light"
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
                closeDialog()
              }}
            >
              <MoonIcon />
              切换主题
              <CommandShortcut>
                {resolvedTheme === "dark" ? "light" : "dark"}
              </CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
