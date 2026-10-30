// Lightweight Docker detection for the desktop shell. Mirrors the states the
// Xiryn service reports (missing / stopped / ready) but lives in the shell so
// the first-run wizard can run before the Next.js service is even up.
const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

// Candidates for the Docker Desktop app, checked in order. Docker Desktop can
// be installed outside the default location (e.g. E:\Docker), so look in a few
// places rather than assuming C:\Program Files.
function desktopAppCandidates() {
  const pf = process.env.ProgramFiles || "C:\\Program Files"
  const localAppData = process.env.LOCALAPPDATA || ""
  const candidates = []
  if (process.platform === "win32") {
    candidates.push(path.join(pf, "Docker", "Docker", "Docker Desktop.exe"))
    candidates.push(
      path.join(localAppData, "Programs", "Docker Desktop", "Docker Desktop.exe")
    )
    // Scan drive roots for a non-default install (e.g. E:\Docker).
    for (const drive of ["D:\\", "E:\\", "F:\\", "G:\\"]) {
      candidates.push(path.join(drive, "Docker", "Docker Desktop.exe"))
    }
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Docker.app")
  }
  return candidates
}

function desktopAppPath() {
  for (const c of desktopAppCandidates()) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function dockerBinaries() {
  if (process.platform === "win32") {
    const pf = process.env.ProgramFiles || "C:\\Program Files"
    return ["docker", path.join(pf, "Docker", "Docker", "resources", "bin", "docker.exe")]
  }
  if (process.platform === "darwin") {
    return [
      "docker",
      "/usr/local/bin/docker",
      "/opt/homebrew/bin/docker",
      "/Applications/Docker.app/Contents/Resources/bin/docker",
    ]
  }
  return ["docker", "/usr/bin/docker", "/usr/local/bin/docker"]
}

// Returns { state: "missing" | "stopped" | "ready", canStart, version, detail }
function probeDocker() {
  let cliFound = false
  let version = null
  let detail = null

  // First: can we run `docker info`? If the CLI exists but the engine is not
  // up, that is "stopped" (not "missing").
  for (const bin of dockerBinaries()) {
    if (bin !== "docker" && !fs.existsSync(bin)) continue
    const r = spawnSync(bin, ["info", "--format", "{{.ServerVersion}}"], {
      timeout: 15000,
      windowsHide: true,
    })
    if (r.error && r.error.code === "ENOENT") continue // this binary absent
    cliFound = true
    if (r.status === 0 && r.stdout && r.stdout.toString().trim()) {
      version = r.stdout.toString().trim()
      break
    }
    if (!detail && r.stderr) {
      const line = r.stderr
        .toString()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .at(-1)
      detail = line || null
    }
  }

  if (version) return { state: "ready", canStart: false, version, detail: null }

  const app = desktopAppPath()
  const canStart = !!app

  if (cliFound) {
    // CLI is installed but the engine is down → stopped.
    return {
      state: "stopped",
      canStart,
      version: null,
      detail: detail || "Docker is not running.",
    }
  }

  // No CLI anywhere → genuinely missing.
  return { state: "missing", canStart, version: null, detail: null }
}

// Launch Docker Desktop if present (best effort, returns true if launched).
function launchDesktop() {
  const app = desktopAppPath()
  if (!app) return false
  const { spawn } = require("node:child_process")
  if (process.platform === "win32") {
    spawn(app, [], { detached: true, stdio: "ignore", windowsHide: true }).unref()
  } else {
    spawn("open", ["-a", app], { detached: true, stdio: "ignore" }).unref()
  }
  return true
}

module.exports = { probeDocker, launchDesktop, desktopAppPath }
