// Assemble the Xiryn (Next.js) app into desktop/resources/app-root so the
// Electron shell can start it as a child process. Run from the repo root:
//
//   node desktop/scripts/bundle-app.mjs [--node <nodeDir>]
//
// It copies the production build (.next), runtime deps (node_modules), and
// the assets the server reads relative to cwd (workstation, db/migrations,
// public, messages) into a single tree. An optional --node dir copies a
// standalone Node runtime into resources/node.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const desktopDir = path.resolve(here, "..")
const repoRoot = path.resolve(desktopDir, "..")
const appRootDest = path.join(desktopDir, "resources", "app-root")

// Parse --node <dir>
const args = process.argv.slice(2)
let nodeDir = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--node" && args[i + 1]) {
    nodeDir = path.resolve(args[i + 1])
  }
}

function copyDir(src, dest, { exclude = [] } = {}) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(s, d, { exclude })
    } else if (entry.isSymbolicLink()) {
      // Resolve symlinks (Next emits symlinked native modules) by copying the
      // target contents.
      const target = fs.realpathSync(s)
      const st = fs.statSync(target)
      if (st.isDirectory()) {
        copyDir(target, d, { exclude })
      } else {
        fs.mkdirSync(path.dirname(d), { recursive: true })
        fs.copyFileSync(target, d)
      }
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true })
      fs.copyFileSync(s, d)
    }
  }
}

function ensureBuild() {
  if (!fs.existsSync(path.join(repoRoot, ".next", "BUILD_ID"))) {
    throw new Error(
      "No production build found. Run `npm run build` in the repo root first."
    )
  }
}

function main() {
  ensureBuild()

  fs.rmSync(appRootDest, { recursive: true, force: true })
  fs.mkdirSync(appRootDest, { recursive: true })

  console.log("[bundle] copying .next ...")
  copyDir(path.join(repoRoot, ".next"), path.join(appRootDest, ".next"))

  console.log("[bundle] copying node_modules ...")
  // Copy the whole node_modules; the server needs real deps (better-sqlite3
  // native binary included). Large but correct.
  copyDir(path.join(repoRoot, "node_modules"), path.join(appRootDest, "node_modules"))

  console.log("[bundle] copying server-relative assets ...")
  const assets = ["workstation", "db", "public", "messages", "lib"]
  for (const name of assets) {
    const src = path.join(repoRoot, name)
    if (fs.existsSync(src)) {
      copyDir(src, path.join(appRootDest, name))
    }
  }

  // The server also needs these at cwd: package.json (version), next config,
  // and the i18n messages (already copied above under messages/).
  for (const f of ["package.json", "next.config.ts", "tsconfig.json"]) {
    const src = path.join(repoRoot, f)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(appRootDest, f))
    }
  }

  if (nodeDir) {
    console.log("[bundle] copying Node runtime ...")
    const nodeDest = path.join(desktopDir, "resources", "node")
    fs.rmSync(nodeDest, { recursive: true, force: true })
    copyDir(nodeDir, nodeDest)
  }

  console.log("[bundle] done →", appRootDest)
}

main()
