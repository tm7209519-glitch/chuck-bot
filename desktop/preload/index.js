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
})
