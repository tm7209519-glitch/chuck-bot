// Auto-update for the Chuck Bot desktop shell, powered by electron-updater
// and GitHub Releases. The updater is wired into the main process and driven
// by IPC from the renderer (check / download / install).

const { autoUpdater } = require("electron-updater")
const { ipcMain, BrowserWindow, dialog } = require("electron")

// Keep the app from nagging on every launch; one check per session is enough.
let checkedThisSession = false
let downloadedVersion = null

function configure() {
  // Prefer a pre-release channel when CHUCK_BOT_PRE_RELEASE is set, so we can
  // test updates internally before going to stable.
  if (process.env.CHUCK_BOT_PRE_RELEASE === "1") {
    autoUpdater.allowPrerelease = true
  }
  // Never auto-install or auto-download silently; the user decides.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("checking-for-update", () => {
    send("update:checking")
  })
  autoUpdater.on("update-available", (info) => {
    send("update:available", info)
  })
  autoUpdater.on("update-not-available", (info) => {
    send("update:not-available", info)
  })
  autoUpdater.on("download-progress", (progress) => {
    send("update:progress", progress)
  })
  autoUpdater.on("update-downloaded", (info) => {
    downloadedVersion = info.version
    send("update:downloaded", info)
  })
  autoUpdater.on("error", (error) => {
    send("update:error", { message: error?.message ?? String(error) })
  })
}

function send(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

function registerUpdaterIpc() {
  configure()

  ipcMain.handle("update:check", async () => {
    if (checkedThisSession) return { already: true }
    checkedThisSession = true
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, version: result?.updateInfo?.version ?? null }
    } catch (error) {
      return { ok: false, message: error?.message ?? String(error) }
    }
  })

  ipcMain.handle("update:download", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error?.message ?? String(error) }
    }
  })

  ipcMain.handle("update:install", () => {
    // quitAndInstall exits the app; on Windows the NSIS installer takes over.
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle("update:downloaded-version", () => downloadedVersion)
}

module.exports = { registerUpdaterIpc }
