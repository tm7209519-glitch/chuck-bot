// Shared types for the desktop shell's preload bridge (window.chuckBot).
// Both the updater and the first-run wizard read from it; keep the global
// declaration here so it isn't duplicated across components.

export type DesktopEnv = {
  docker: () => Promise<{
    state?: string
    version?: string
    canStart?: boolean
    downloadUrl?: string
    message?: string
  }>
  startDocker: () => Promise<{ launched: boolean }>
  openExternal: (url: string) => Promise<{ ok: boolean }>
}

export type DesktopUpdateApi = {
  check: () => Promise<{ ok?: boolean; already?: boolean; version?: string | null; message?: string }>
  download: () => Promise<{ ok?: boolean; message?: string }>
  install: () => Promise<void>
  on: (
    channel: string,
    listener: (payload: { version?: string; percent?: number; message?: string }) => void
  ) => () => void
}

declare global {
  interface Window {
    chuckBot?: {
      version?: string
      env?: DesktopEnv
      update?: DesktopUpdateApi
    }
  }
}
