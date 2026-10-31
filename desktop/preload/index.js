// Chuck Bot preload — exposes a minimal, sandbox-safe bridge to the renderer.
const { contextBridge, ipcRenderer } = require("electron")

// The app version is injected by the main process via --chuck-bot-version
// (additionalArguments), because a sandboxed preload cannot require package.json.
const versionArg = process.argv.find((arg) => arg.startsWith("--chuck-bot-version="))
const version = versionArg ? versionArg.slice("--chuck-bot-version=".length) : "0.0.0"

contextBridge.exposeInMainWorld("chuckBot", {
  version,
  platform: process.platform,
  // Environment diagnostics for the first-run wizard.
  env: {
    docker: () => ipcRenderer.invoke("env:docker"),
    startDocker: () => ipcRenderer.invoke("env:start-docker"),
    openExternal: (url) => ipcRenderer.invoke("env:open-external", url),
  },
  // Auto-update (electron-updater). Events are pushed to the renderer; the
  // renderer calls these to drive check / download / install.
  update: {
    check: () => ipcRenderer.invoke("update:check"),
    download: () => ipcRenderer.invoke("update:download"),
    install: () => ipcRenderer.invoke("update:install"),
    downloadedVersion: () => ipcRenderer.invoke("update:downloaded-version"),
    on: (channel, listener) => {
      const allowed = [
        "update:checking",
        "update:available",
        "update:not-available",
        "update:progress",
        "update:downloaded",
        "update:error",
      ]
      if (!allowed.includes(channel)) return () => {}
      const wrapped = (_event, payload) => listener(payload)
      ipcRenderer.on(channel, wrapped)
      return () => ipcRenderer.removeListener(channel, wrapped)
    },
  },
})
