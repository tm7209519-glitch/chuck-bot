// IPC handlers for the first-run wizard and env diagnostics. The renderer
// calls these through the sandbox-safe preload bridge (chuckBot.env).
const { ipcMain, shell } = require("electron")
const { probeDocker, launchDesktop } = require("./docker")

function registerIpc() {
  // Query the current Docker state for the first-run wizard.
  ipcMain.handle("env:docker", () => {
    const result = probeDocker()
    return {
      ...result,
      downloadUrl: "https://www.docker.com/products/docker-desktop/",
    }
  })

  // Ask the shell to (try to) launch Docker Desktop.
  ipcMain.handle("env:start-docker", () => {
    const launched = launchDesktop()
    return { launched }
  })

  // Open a URL in the system browser.
  ipcMain.handle("env:open-external", (_event, url) => {
    if (typeof url === "string" && /^https?:\/\//.test(url)) {
      shell.openExternal(url)
      return { ok: true }
    }
    return { ok: false }
  })
}

module.exports = { registerIpc }
