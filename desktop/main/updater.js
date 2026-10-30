// Auto-update for the Chuck Bot desktop shell, powered by electron-updater
// and GitHub Releases. The updater is wired into the main process and driven
// by IPC from the renderer (check / download / install).
//
// electron-updater only works in a packaged app (it reads the bundled app
// metadata and the GitHub release feed). In dev/source mode (`electron .`)
// there is nothing to update, so we keep it inert instead of crashing.

const { app, ipcMain, BrowserWindow } = require("electron")

// Lazy-load the autoUpdater only when running packaged; importing it in dev
// throws because `app.getVersion()` is undefined without packaged metadata.
function getAutoUpdater() {
  if (!app.isPackaged) return null
  try {
    return require("electron-updater").autoUpdater
  } catch {
    return null
  }
}

// Keep the app from nagging on every launch; one check per session is enough.
let checkedThisSession = false
let downloadedVersion = null

function configure() {
  const autoUpdater = getAutoUpdater()
  if (!autoUpdater) return

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
    const autoUpdater = getAutoUpdater()
    if (!autoUpdater) return { ok: false, message: "updates are only available in the installed app" }
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
    const autoUpdater = getAutoUpdater()
    if (!autoUpdater) return { ok: false, message: "updates are only available in the installed app" }
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error?.message ?? String(error) }
    }
  })

  ipcMain.handle("update:install", () => {
    const autoUpdater = getAutoUpdater()
    if (!autoUpdater) return
    // quitAndInstall exits the app; on Windows the NSIS installer takes over.
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle("update:downloaded-version", () => downloadedVersion)
}

module.exports = { registerUpdaterIpc }
