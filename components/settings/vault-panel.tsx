"use client"

import * as React from "react"
import {
  CreditCardIcon,
  IndianRupeeIcon,
  KeyRoundIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react"

import { removeFromVault, saveToVault, vaultOverview } from "@/actions/vault"
import { Confirm } from "@/components/confirm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { VAULT_FORMS, VaultForm } from "@/components/vault/vault-form"
import type { KeySource, VaultKind } from "@/lib/vault"

type Overview = Awaited<ReturnType<typeof vaultOverview>>
type Item = Extract<Overview, { ok: true }>["items"][number]

const ICONS: Record<VaultKind, React.ComponentType<{ className?: string }>> = {
  card: CreditCardIcon,
  upi: IndianRupeeIcon,
  login: KeyRoundIcon,
  identity: UserRoundIcon,
  code: LockIcon,
}

const KEY_SOURCE: Record<KeySource, string> = {
  keychain: "密钥存于 macOS 钥匙串",
  dpapi: "密钥受 Windows (DPAPI) 保护",
  "secret-service": "密钥存于系统 keyring",
  file: "密钥在数据目录外的私有文件里",
  env: "密钥来自 XIRYN_VAULT_KEY",
}

const ADDABLE: VaultKind[] = ["card", "upi", "login", "identity"]

function ago(date: Date | string | null) {
  if (!date) return "从未使用"
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟前使用`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} 小时前使用`
  return `${Math.round(hours / 24)} 天前使用`
}

export function VaultPanel() {
  const [overview, setOverview] = React.useState<Overview | null>(null)
  const [adding, setAdding] = React.useState<VaultKind | null>(null)

  const refresh = React.useCallback(async () => setOverview(await vaultOverview()), [])
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const items: Item[] = overview?.ok ? overview.items : []

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-surface/50 p-4">
      <div className="flex items-start gap-3">
        <LockIcon className="mt-0.5 size-4 shrink-0 text-rigel" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">保险库</span>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            登录信息、卡片、UPI ID 和个人资料，在这台电脑上加密。Agent 只会看到一个脱敏提示，如「Visa ···· 4242」；Chuck Bot 会把真实内容直接填入页面。登录信息只在其所属网站上填写，且每次支付都需要你批准。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ADDABLE.map((kind) => {
          const Icon = ICONS[kind]
          return (
            <Button
              key={kind}
              size="sm"
              variant="outline"
              onClick={() => setAdding(kind)}
            >
              <PlusIcon data-icon="inline-start" />
              <Icon className="size-3.5" />
              {VAULT_FORMS[kind].title}
            </Button>
          )
        })}
        <span className="ml-auto font-mono text-[10.5px] text-faint">
          {overview?.ok && overview.source
            ? `AES-256-GCM · ${KEY_SOURCE[overview.source]}`
            : overview && !overview.ok
              ? overview.error
              : ""}
        </span>
      </div>

      {overview === null ? (
        <Spinner className="size-4" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[12.5px] text-muted-foreground">
          还没有保存任何内容。添加一张卡片，让 Agent 在你批准后付款；或添加登录信息，登录时无需每次都询问你。
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {items.map((item) => {
            const Icon = ICONS[item.kind]
            return (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[13px] font-medium">{item.label}</span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {item.hint}
                  </span>
                </div>
                <span className="hidden font-mono text-[10.5px] text-faint sm:block">
                  {ago(item.lastUsedAt)}
                </span>
                <Confirm
                  trigger={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`删除 ${item.label}`}
                    >
                      <Trash2Icon />
                    </Button>
                  }
                  title={`删除「${item.label}」？`}
                  description="它将从保险库移除，Agent 无法再使用。"
                  action="删除"
                  onConfirm={async () => {
                    await removeFromVault(item.id)
                    await refresh()
                    toast.add({ type: "success", title: "已从保险库移除" })
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={!!adding} onOpenChange={(open) => !open && setAdding(null)}>
        <DialogContent className="sm:max-w-md">
          {adding && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <DialogTitle>添加{VAULT_FORMS[adding].title}</DialogTitle>
                <DialogDescription>
                  保存的瞬间就在这台电脑上加密。之后永远不会再显示，无论是这里还是任何 Agent。
                </DialogDescription>
              </div>
              <VaultForm
                kind={adding}
                onCancel={() => setAdding(null)}
                onSubmit={async (data, options) => {
                  const result = await saveToVault(adding, data, options.label)
                  if (!result.ok) return result.error
                  setAdding(null)
                  await refresh()
                  toast.add({ type: "success", title: `已保存 · ${result.item.hint}` })
                  return null
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
