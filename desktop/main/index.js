// Chuck Bot desktop shell — main process.
//
// This is a THIN shell around the Xiryn (Next.js) service. It does NOT
// reimplement agent logic. It:
//   1. Enforces a single instance.
//   2. Resolves the bundled Node runtime and the Xiryn app root.
//   3. Starts the Next.js service on 127.0.0.1:6796 (or a free port).
//   4. Polls the health endpoint until the service is ready.
//   5. Opens a BrowserWindow pointing at the local URL.
//   6. Manages a tray icon; closing the window minimizes to tray.
//   7. On real quit, tears down the service it started (never the user's own
//      Docker/Ollama).

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require("electron")
const { spawn } = require("node:child_process")
const path = require("node:path")
const fs = require("node:fs")
const http = require("node:http")
const { registerIpc } = require("./ipc")
const { registerUpdaterIpc } = require("./updater")
const { probeDocker, launchDesktop } = require("./docker")

const APP_URL = process.env.CHUCK_BOT_URL || "http://127.0.0.1:6796"
const PORT = Number(process.env.CHUCK_BOT_PORT || 6796)
const HOST = "127.0.0.1"

let mainWindow = null
let tray = null
let serverChild = null
let isQuitting = false

// --- path resolution -------------------------------------------------------

// When packaged, resources live inside app.asar / asar.unpacked. When running
// from source (npm start), we resolve relative to the repo root.
function appRoot() {
  if (app.isPackaged) {
    // Packaged: the Xiryn app (with .next, node_modules, workstation) is
    // copied next to the Electron app under resources/app-root.
    return path.join(process.resourcesPath, "app-root")
  }
  // Source: desktop/ sits inside the repo, so the app root is one level up.
  return path.resolve(__dirname, "..", "..")
}

function nodeBin() {
  const bundled = process.platform === "win32" ? "node.exe" : "node"
  const bundledPath = path.join(process.resourcesPath, "node", bundled)
  if (fs.existsSync(bundledPath)) return bundledPath
  if (app.isPackaged) {
    throw new Error(`Bundled Node runtime is missing: ${bundledPath}`)
  }
  return process.platform === "win32" ? "node.exe" : "node"
}

function nextBin() {
  // Standalone build: the entrypoint is a self-contained server.js at the app
  // root, not the `next` CLI. The bundled Node runtime runs it directly.
  return path.join(appRoot(), "server.js")
}

function userDataDir() {
  // Xiryn writes SQLite, vault keys and logs here. Must be writable and
  // survive app updates, so we point it at Electron's per-user data dir.
  return path.join(app.getPath("userData"), "xiryn-data")
}

// --- single instance -------------------------------------------------------

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// --- health check ----------------------------------------------------------

function checkHealth(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: HOST, port: PORT, path: "/", method: "GET", timeout: timeoutMs },
      (res) => {
        res.resume()
        resolve(res.statusCode > 0)
      }
    )
    req.on("timeout", () => {
      req.destroy()
      resolve(false)
    })
    req.on("error", () => resolve(false))
    req.end()
  })
}

async function waitForReady(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await checkHealth()) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

// --- service lifecycle -----------------------------------------------------

function startService() {
  const root = appRoot()
  const dataDir = userDataDir()
  fs.mkdirSync(dataDir, { recursive: true })

  const logStream = fs.createWriteStream(path.join(dataDir, "xiryn.log"), {
    flags: "a",
  })

  const runtime = nodeBin()
  // Standalone server.js honors HOSTNAME/PORT env vars and reads nothing from
  // CLI args, unlike `next start`.
  const args = [nextBin()]
  const childEnv = { ...process.env }
  delete childEnv.ELECTRON_RUN_AS_NODE
  delete childEnv.NODE_OPTIONS
  serverChild = spawn(
    runtime,
    args,
    {
      cwd: root,
      env: {
        ...childEnv,
        NODE_ENV: "production",
        HOSTNAME: HOST,
        PORT: String(PORT),
        XIRYN_DATA_DIR: dataDir,
        // The app's own update checker points at GitHub; the desktop shell
        // owns updates instead, so disable the in-app check.
        XIRYN_UPDATE_CHECK: "off",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  )

  serverChild.stdout.on("data", (d) => logStream.write(d))
  serverChild.stderr.on("data", (d) => logStream.write(d))
  serverChild.on("exit", (code, signal) => {
    logStream.write(`\n[chuck-bot] service exited code=${code} signal=${signal}\n`)
    logStream.end()
    serverChild = null
  })
  serverChild.on("error", (err) => {
    logStream.write(`\n[chuck-bot] failed to start service: ${err}\n`)
  })
}

function stopService() {
  if (!serverChild) return
  // Windows: the child is a node.exe running next start. Kill the whole tree
  // on Windows so Next workers are cleaned up too.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(serverChild.pid), "/T", "/F"], {
      windowsHide: true,
    })
  } else {
    serverChild.kill("SIGTERM")
  }
  serverChild = null
}

// --- window ----------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Chuck Bot",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.loadURL(APP_URL)

  // Close → hide to tray, unless we are really quitting.
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// --- tray ------------------------------------------------------------------

function createTray() {
  // A tiny 16x16 fallback icon; replace with a real brand icon in resources.
  const icon = nativeImage.createFromDataURL(
    "data:image/svg+xml;base64," +
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" rx="3" fill="#0B0E14"/><circle cx="8" cy="8" r="4" fill="#7CC4FF"/></svg>`
      ).toString("base64")
  )
  tray = new Tray(icon)
  tray.setToolTip("Chuck Bot")
  const menu = Menu.buildFromTemplate([
    { label: "打开 Chuck Bot", click: () => showWindow() },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on("click", () => showWindow())
}

function showWindow() {
  if (!mainWindow) createWindow()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// --- app lifecycle ---------------------------------------------------------

app.whenReady().then(async () => {
  fs.mkdirSync(userDataDir(), { recursive: true })
  registerIpc()
  registerUpdaterIpc()

  startService()
  const ready = await waitForReady()
  if (serverChild) {
    console.log(`[chuck-bot] Next service pid=${serverChild.pid}, runtime=${nodeBin()}`)
  }

  createWindow()
  createTray()

  if (!ready) {
    dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Chuck Bot",
      message: "本地服务启动超时",
      detail: "Chuck Bot 服务未能及时就绪。请检查日志，或确认 6796 端口未被占用。",
    })
    return
  }

  // First-run env guidance: if Docker is missing, offer to download it. The
  // service itself will build the workstation image once Docker is ready.
  const docker = probeDocker()
  if (docker.state === "missing") {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Chuck Bot 首次运行",
      message: "需要 Docker 才能运行 Agent 的小电脑",
      detail:
        "每个 Agent 都会在一个独立的 Linux 桌面（Docker 容器）里工作。检测到本机尚未安装 Docker。\n\n安装 Docker Desktop 后，Agent 的小电脑镜像会自动构建。",
      buttons: ["前往下载 Docker", "稍后再说"],
      defaultId: 0,
      cancelId: 1,
    })
    if (response === 0) {
      shell.openExternal("https://www.docker.com/products/docker-desktop/")
    }
  }
})

app.on("before-quit", () => {
  isQuitting = true
})

app.on("will-quit", () => {
  stopService()
})

app.on("window-all-closed", () => {
  // On macOS keep running in the tray; on Windows/Linux the tray also keeps
  // us alive, so never quit just because the window closed.
})

// Allow opening external links in the system browser, not inside the shell.
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url)
    }
    return { action: "deny" }
  })
})
