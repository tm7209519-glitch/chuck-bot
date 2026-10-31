"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { createSquad, deleteSquad, updateSquad } from "@/actions/squads"
import { Confirm } from "@/components/confirm"
import { Glyph, SquadGlyph } from "@/components/glyph"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useWorkspace } from "@/components/workspace/context"
import { squadInputSchema } from "@/db/schema"
import type { NavSquad } from "@/queries/workspace"

function SquadForm({ squad }: { squad?: NavSquad }) {
  const router = useRouter()
  const { nav, closeDialog, openAgentDialog } = useWorkspace()

  const form = useForm({
    resolver: zodResolver(squadInputSchema),
    defaultValues: { name: squad?.name ?? "", agentIds: squad?.agentIds ?? [] },
  })
  const { isSubmitting } = form.formState
  const selected = useWatch({ control: form.control, name: "agentIds" })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (squad) {
        await updateSquad(squad.id, values)
        toast.add({ type: "success", title: `${values.name} 已更新` })
        closeDialog()
      } else {
        const { squad: created, threadId } = await createSquad(values)
        toast.add({ type: "success", title: `${created.name} 已组建` })
        closeDialog()
        router.push(`/s/${created.id}/${threadId}`)
      }
    } catch (error) {
      toast.add({
        type: "error",
        title: squad ? "无法保存 Squad" : "无法创建 Squad",
        description: error instanceof Error ? error.message : undefined,
      })
    }
  })

  const seeds = selected
    .map((id) => nav.agents.find((agent) => agent.id === id)?.glyph)
    .filter((seed): seed is string => !!seed)

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      <DialogHeader className="gap-1 border-b px-5 pt-5 pb-4">
        <span className="label-mono">
          {squad ? "// 配置 Squad" : "// 新建 Squad"}
        </span>
        <DialogTitle className="text-lg font-semibold tracking-tight">
          {squad ? squad.name : "组建一个 Squad"}
        </DialogTitle>
        <DialogDescription>
          在同一个会话里与多个 Agent 对话。每个都保留自己的工作站和记忆，并能把任务转交给角色更合适的队友。
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 py-5">
        <FieldGroup className="gap-4">
          <div className="flex items-end gap-3">
            <SquadGlyph
              seeds={seeds.length ? seeds : ["empty"]}
              className="size-[52px]"
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="flex-1">
                  <FieldLabel htmlFor="squad-name">名称</FieldLabel>
                  <Input
                    {...field}
                    id="squad-name"
                    placeholder="启动小组"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            name="agentIds"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-baseline justify-between">
                  <FieldLabel>成员</FieldLabel>
                  <span className="font-mono text-[10.5px] text-faint">
                    已选 {field.value.length} 个 · 顺序 = 谁先回答
                  </span>
                </div>
                {nav.agents.length < 2 ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-3 text-[13px] text-muted-foreground">
                    你需要至少两个 Agent。
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openAgentDialog()}
                    >
                      新建 Agent
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y rounded-md border">
                    {nav.agents.map((agent) => {
                      const checked = field.value.includes(agent.id)
                      const position = field.value.indexOf(agent.id)
                      return (
                        <label
                          key={agent.id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              field.onChange(
                                next
                                  ? [...field.value, agent.id]
                                  : field.value.filter((id) => id !== agent.id)
                              )
                            }
                          />
                          <Glyph seed={agent.glyph} className="size-6" />
                          <span className="flex min-w-0 flex-1 flex-col leading-tight">
                            <span className="truncate text-[13px] font-medium">
                              {agent.name}
                            </span>
                            <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                              {agent.role}
                            </span>
                          </span>
                          {checked && (
                            <span className="font-mono text-[10.5px] text-rigel">
                              #{position + 1}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
      </div>

      <DialogFooter className="mx-0 mb-0 items-center rounded-b-xl px-5 py-3">
        {squad && (
          <Confirm
            trigger={
              <Button
                type="button"
                variant="ghost"
                className="text-destructive sm:mr-auto"
              >
                <Trash2Icon data-icon="inline-start" />
                解散
              </Button>
            }
            title={`解散 ${squad.name}？`}
            description="该 Squad 及其会话将被删除。它的 Agent、记忆和工作站会保留。"
            action="解散 Squad"
            onConfirm={async () => {
              await deleteSquad(squad.id)
              toast.add({ type: "success", title: `${squad.name} 已解散` })
              closeDialog()
              router.push("/")
            }}
          />
        )}
        <DialogClose render={<Button type="button" variant="outline" />}>
          取消
        </DialogClose>
        <Button type="submit" disabled={isSubmitting || nav.agents.length < 2}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {squad ? "保存" : "创建 Squad"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function SquadDialog() {
  const { dialog, closeDialog } = useWorkspace()
  const state = dialog?.kind === "squad" ? dialog : null

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="flex max-h-[min(90svh,720px)] flex-col gap-0 p-0 sm:max-w-lg">
        {state && <SquadForm key={state.squad?.id ?? "new"} squad={state.squad} />}
      </DialogContent>
    </Dialog>
  )
}
