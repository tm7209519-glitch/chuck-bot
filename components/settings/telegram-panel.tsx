"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LinkIcon,
  RefreshCwIcon,
  SendIcon,
  UnlinkIcon,
} from "lucide-react"

import {
  getTelegramPanel,
  newPairingCode,
  saveTelegramToken,
  unpair,
  type TelegramPanel,
} from "@/actions/telegram"
import { Confirm } from "@/components/confirm"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

function Step({
  n,
  title,
  done,
  active,
  children,
}: {
  n: number
  title: string
  done: boolean
  active: boolean
  children: React.ReactNode
}) {
  return (
    <li className="group/step relative flex gap-4 pb-7 last:pb-0">
      <span className="absolute top-7 bottom-0 left-[13px] w-px bg-border group-last/step:hidden" />
      <span
        className={cn(
          "relative grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
          done
            ? "border-ok/40 bg-ok/10 text-ok"
            : active
              ? "border-rigel/50 bg-rigel-soft text-rigel"
              : "bg-background text-muted-foreground"
        )}
      >
        {done ? <CheckIcon className="size-3.5" /> : n}
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2 pt-0.5",
          !active && !done && "opacity-60"
        )}
      >
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-muted px-1 py-px font-mono text-[12px] text-foreground">
      {children}
    </code>
  )
}

export function TelegramPanelView({ initial }: { initial: TelegramPanel }) {
  const router = useRouter()
  const [panel, setPanel] = React.useState(initial)
  const [token, setToken] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const connected = panel.configured && !!panel.bot
  const paired = !!panel.owner

  // While waiting for the phone to pair, check back every few seconds
  React.useEffect(() => {
    if (!panel.configured || paired) return
    const timer = setInterval(async () => {
      const next = await getTelegramPanel()
      setPanel(next)
      if (next.owner) {
        toast.add({ type: "success", title: `已与 ${next.owner.name} 配对` })
        router.refresh()
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [panel.configured, paired, router])

  const save = async (value: string | null) => {
    setSaving(true)
    try {
      const next = await saveTelegramToken(value)
      setPanel(next)
      setToken("")
      if (value) {
        toast.add(
          next.bot
            ? { type: "success", title: `已连接为 @${next.bot.username}` }
            : {
                type: "error",
                title: "已保存，但 Telegram 尚未响应",
                description: next.error ?? undefined,
              }
        )
      }
    } catch (error) {
      toast.add({
        type: "error",
        title: "无法保存令牌",
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 rounded-xl border bg-surface/50 p-5 xl:grid-cols-[1fr_220px]">
      <ol className="flex flex-col">
        <Step
          n={1}
          title="用 @BotFather 创建机器人"
          done={panel.configured}
          active={!panel.configured}
        >
          <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              在 Telegram 中打开{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-rigel hover:underline"
              >
                @BotFather
              </a>{" "}
              （官方账号有蓝色勾选），点击 <b className="text-foreground">开始</b>。
            </p>
            <p>
              发送 <Code>/newbot</Code>。给它一个显示名称（例如{" "}
              <Code>我的 Chuck Bot</Code>
              ），再给一个以 <Code>bot</Code> 结尾的用户名（例如{" "}
              <Code>my_chuck_bot</Code>）。
            </p>
            <p>
              BotFather 会回复一个形如 <Code>123456789:AAH…</Code> 的令牌。这就是 Chuck Bot 唯一需要的东西。请像对待密码一样保管它。
            </p>
          </div>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            打开 @BotFather <ExternalLinkIcon className="size-3" />
          </a>
        </Step>

        <Step n={2} title="粘贴令牌" done={connected} active={!connected}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (token.trim()) save(token)
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  panel.configured
                    ? "令牌已保存——粘贴新令牌以替换"
                    : "123456789:AAH…"
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent pr-2.5 pl-8 font-mono text-[12px] outline-none placeholder:text-faint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 dark:bg-input/30"
              />
            </div>
            <Button type="submit" size="sm" disabled={saving || !token.trim()}>
              {saving && <Spinner data-icon="inline-start" />}
              连接
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11.5px]">
            {connected ? (
              <span className="flex items-center gap-1.5 text-ok">
                <span className="size-1.5 rounded-full bg-ok" />
                正在轮询 @{panel.bot!.username}
              </span>
            ) : panel.configured ? (
              <span className="flex items-center gap-1.5 text-betelgeuse">
                <span className="size-1.5 rounded-full bg-betelgeuse" />
                {panel.error ?? "连接中…"}
              </span>
            ) : (
              <span className="text-faint">
                或在 .env 中设置 TELEGRAM_BOT_TOKEN 并重启
              </span>
            )}
            {panel.configured && (
              <Confirm
                trigger={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    断开连接
                  </button>
                }
                title="断开 Telegram？"
                description="机器人令牌将从 Chuck Bot 中移除，配对账号也会被遗忘。机器人本身仍保留在 Telegram 中。"
                action="断开"
                onConfirm={() => save(null)}
              />
            )}
          </div>
          {connected && panel.error && (
            <p className="font-mono text-[11.5px] text-betelgeuse">{panel.error}</p>
          )}
        </Step>

        <Step
          n={3}
          title="配对你的 Telegram 账号"
          done={paired}
          active={connected && !paired}
        >
          {paired ? (
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="text-muted-foreground">
                已与 <b className="text-foreground">{panel.owner!.name}</b>{" "}
                配对。只有这个账号可以使用该机器人。
              </span>
              <Confirm
                trigger={
                  <Button size="xs" variant="ghost" className="text-muted-foreground">
                    <UnlinkIcon data-icon="inline-start" />
                    取消配对
                  </Button>
                }
                title="取消配对这个 Telegram 账号？"
                description="机器人将停止响应它。你可以用新码再次配对（或配对另一个账号）。"
                action="取消配对"
                onConfirm={async () => setPanel(await unpair())}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <p>
                用手机扫描二维码，或打开链接——Telegram 会打开你的机器人；点击{" "}
                <b className="text-foreground">开始</b>。更想打字？向机器人发送{" "}
                <Code>/pair {panel.pairCode ?? "…"}</Code>。
              </p>
              {panel.link && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    nativeButton={false}
                    render={<a href={panel.link} target="_blank" rel="noreferrer" />}
                  >
                    <SendIcon data-icon="inline-start" />
                    在 Telegram 中打开
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await navigator.clipboard.writeText(panel.link!)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }}
                  >
                    {copied ? (
                      <CheckIcon data-icon="inline-start" />
                    ) : (
                      <CopyIcon data-icon="inline-start" />
                    )}
                    复制链接
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => setPanel(await newPairingCode())}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    新码
                  </Button>
                </div>
              )}
            </div>
          )}
        </Step>

        <Step n={4} title="随时随地对讲" done={paired} active={paired}>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            像在这里和 Agent 聊天一样给机器人发消息。<Code>/agents</Code>{" "}
            切换 Agent 或 Squad，<Code>/new</Code> 开启新会话，<Code>/stop</Code>{" "}
            中断。从 Telegram 发起的会话也会出现在这个应用里。机器人要能回复，Chuck Bot 必须在这台电脑上运行。
          </p>
        </Step>
      </ol>

      <div className="flex flex-col items-center gap-3 xl:border-l xl:pl-6">
        {panel.qr && !paired ? (
          <>
            <div
              className="size-[180px] rounded-lg bg-white p-3 [&_svg]:size-full"
              // Generated locally by the qrcode package from our own link
              dangerouslySetInnerHTML={{ __html: panel.qr }}
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              验证码 <span className="text-foreground">{panel.pairCode}</span>
            </span>
          </>
        ) : (
          <div className="grid size-[180px] place-items-center rounded-lg border border-dashed text-center">
            <span className="flex flex-col items-center gap-2 px-4 font-mono text-[11px] text-faint">
              {paired ? (
                <>
                  <CheckIcon className="size-5 text-ok" />
                  远程访问已开启
                </>
              ) : (
                <>
                  <LinkIcon className="size-5" />
                  机器人连接后会出现配对验证码
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
