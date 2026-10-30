// Chuck Bot preload — exposes a minimal, safe bridge to the renderer.
// Currently the shell needs no privileged IPC; the service and UI talk over
// plain HTTP on loopback. This file exists so future features (tray status,
// native notifications, update prompts) have a typed, sandbox-safe seam.
const { contextBridge } = require("electron")

contextBridge.exposeInMainWorld("chuckBot", {
  version: process.env.npm_package_version || "0.1.0",
  platform: process.platform,
})
