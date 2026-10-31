// Smoke test for the packaged desktop app. Verifies the bundled standalone
// Next.js service actually boots and serves pages, independent of the
// Electron GUI (which can't open on a headless CI runner).
//
// It runs the bundled Node runtime against the bundled server.js with a throwaway
// data dir, polls the health endpoint, then tears the process down. Used by the
// release workflow after `npm run release` so a broken bundle never ships.
//
//   node scripts/smoke-test.mjs <win-unpacked-dir> [--port <n>]

import { spawn } from "node:child_process"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const unpacked = process.argv[2]
if (!unpacked) {
  console.error("usage: node scripts/smoke-test.mjs <win-unpacked-dir> [--port <n>]")
  process.exit(2)
}

let port = 6796
const portIdx = process.argv.indexOf("--port")
if (portIdx !== -1) port = Number(process.argv[portIdx + 1])

const appRoot = path.join(unpacked, "resources", "app-root")
const nodeBin = path.join(
  unpacked,
  "resources",
  "node",
  process.platform === "win32" ? "node.exe" : "node"
)
const serverJs = path.join(appRoot, "server.js")

// 1. Assert the bundle is structurally complete before running anything.
const required = [
  nodeBin,
  serverJs,
  path.join(appRoot, "db", "migrations"),
  path.join(appRoot, "workstation", "Dockerfile"),
  path.join(appRoot, "messages", "zh.json"),
]
const missing = required.filter((p) => !fs.existsSync(p))
if (missing.length) {
  console.error("SMOKE FAIL: missing bundled files:\n  " + missing.join("\n  "))
  process.exit(1)
}
// The bundled Node must be a real executable, not a stub.
if (fs.statSync(nodeBin).size < 1024 * 1024) {
  console.error("SMOKE FAIL: bundled node.exe is unexpectedly small (stub?)")
  process.exit(1)
}

// 2. Boot the bundled service against a throwaway data dir.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chuckbot-smoke-"))
const child = spawn(nodeBin, [serverJs], {
  cwd: appRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    XIRYN_DATA_DIR: dataDir,
    XIRYN_UPDATE_CHECK: "off",
  },
  stdio: ["ignore", "pipe", "pipe"],
})

let output = ""
child.stdout.on("data", (d) => (output += d))
child.stderr.on("data", (d) => (output += d))

const base = `http://127.0.0.1:${port}`

function probe(pathname) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: pathname, method: "GET", timeout: 3000 },
      (res) => {
        res.resume()
        resolve(res.statusCode)
      }
    )
    req.on("timeout", () => {
      req.destroy()
      resolve(0)
    })
    req.on("error", () => resolve(0))
    req.end()
  })
}

async function waitReady(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break
    if ((await probe("/")) === 200) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function main() {
  const ready = await waitReady()
  if (!ready) {
    console.error("SMOKE FAIL: service did not become ready.\n" + output.slice(-4000))
    child.kill("SIGKILL")
    process.exit(1)
  }

  // 3. Probe the key routes.
  const routes = ["/", "/settings", "/templates", "/routines", "/usage"]
  const results = {}
  for (const r of routes) results[r] = await probe(r)

  const bad = Object.entries(results).filter(([, code]) => code !== 200)
  if (bad.length) {
    console.error("SMOKE FAIL: routes not 200:\n" + bad.map(([r, c]) => `  ${r} → ${c}`).join("\n"))
    child.kill("SIGKILL")
    process.exit(1)
  }

  // 4. Confirm the database migrated (server created the tables on boot).
  const dbPath = path.join(dataDir, "xiryn.db")
  if (!fs.existsSync(dbPath)) {
    console.error("SMOKE FAIL: no database created at " + dbPath)
    child.kill("SIGKILL")
    process.exit(1)
  }

  console.log("SMOKE OK: " + routes.map((r) => `${r}=${results[r]}`).join(" ") + " db=created")

  // 5. Tear down.
  child.kill("SIGTERM")
  await new Promise((r) => setTimeout(r, 1000))
  if (child.exitCode === null) child.kill("SIGKILL")
  fs.rmSync(dataDir, { recursive: true, force: true })
}

main().catch((error) => {
  console.error("SMOKE FAIL:", error)
  child.kill("SIGKILL")
  process.exit(1)
})
