import type { RoutineSchedule } from "@/db/schema"

// When routines run, in the local time of the computer Xiryn runs on.
// Client-safe.

export const WEEKDAYS = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
]

function at(day: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const next = new Date(day)
  next.setHours(hours, minutes, 0, 0)
  return next
}

// "2026-10-21T09:00" in local time
export function parseLocal(at: string) {
  const [date, time] = at.split("T")
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

// The first run strictly after `from`, or null when there are no more
export function nextRun(schedule: RoutineSchedule, from = new Date()): Date | null {
  if (schedule.kind === "once") {
    const at = parseLocal(schedule.at)
    return at > from ? at : null
  }
  if (schedule.kind === "hourly") {
    const next = new Date(from.getTime() + schedule.every * 3_600_000)
    next.setSeconds(0, 0)
    return next
  }
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(from)
    day.setDate(from.getDate() + offset)
    const candidate = at(day, schedule.time)
    if (candidate <= from) continue
    const weekday = candidate.getDay()
    if (schedule.kind === "weekdays" && (weekday === 0 || weekday === 6)) continue
    if (schedule.kind === "weekly" && weekday !== schedule.day) continue
    return candidate
  }
  // Unreachable for valid schedules
  return new Date(from.getTime() + 86_400_000)
}

export function describeSchedule(schedule: RoutineSchedule) {
  switch (schedule.kind) {
    case "daily":
      return `每天 ${schedule.time}`
    case "weekdays":
      return `工作日 ${schedule.time}`
    case "weekly":
      return `每${WEEKDAYS[schedule.day]} ${schedule.time}`
    case "hourly":
      return schedule.every === 1 ? "每小时" : `每 ${schedule.every} 小时`
    case "once": {
      const at = parseLocal(schedule.at)
      return `一次，${at.toLocaleDateString("zh-CN", { weekday: "short", day: "numeric", month: "short" })} ${schedule.at.slice(11)}`
    }
  }
}
