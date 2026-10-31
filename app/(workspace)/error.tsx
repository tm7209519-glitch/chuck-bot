"use client"

import { useEffect } from "react"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid flex-1 place-items-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <TriangleAlertIcon className="size-6 text-betelgeuse" />
        <div className="flex flex-col gap-1.5">
          <span className="label-mono">{"// 运行时错误"}</span>
          <h1 className="text-lg font-semibold">此页面出现了问题。</h1>
          <p className="font-mono text-[12px] break-words text-muted-foreground">
            {error.message || "未知错误"}
            {error.digest && (
              <span className="block text-faint">digest {error.digest}</span>
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcwIcon data-icon="inline-start" />
          重试
        </Button>
      </div>
    </div>
  )
}
