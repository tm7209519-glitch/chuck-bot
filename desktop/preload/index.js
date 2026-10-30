// Chuck Bot preload — exposes a minimal, sandbox-safe bridge to the renderer.
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("chuckBot", {
  version: process.env.npm_package_version || "0.1.0",
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
