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

  const standaloneDir = path.join(repoRoot, ".next", "standalone")
  if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
    throw new Error(
      "No standalone build found. Set `output: 'standalone'` in next.config.ts and run `npm run build`."
    )
  }

  fs.rmSync(appRootDest, { recursive: true, force: true })
  fs.mkdirSync(appRootDest, { recursive: true })

  // The standalone build is a self-contained server.js + a minimal
  // node_modules tree. It omits devDependencies and build tooling, so it is
  // much smaller than the full node_modules. Exclude `data`: Next's trace
  // sometimes pulls in the local dev database/vault key, which must never
  // ship — runtime data lives in XIRYN_DATA_DIR (the user data folder).
  console.log("[bundle] copying standalone build ...")
  copyDir(standaloneDir, appRootDest, { exclude: ["data"] })

  // Next's standalone output omits files the server reads at runtime relative
  // to cwd: database migrations, the workstation image source (Dockerfile +
  // rootfs), static public assets and the i18n messages. Copy them into the
  // app root, mirroring the repo layout the server expects.
  console.log("[bundle] copying runtime assets ...")
  for (const name of ["db", "workstation", "public", "messages"]) {
    const src = path.join(repoRoot, name)
    if (fs.existsSync(src)) {
      copyDir(src, path.join(appRootDest, name))
    }
  }

  // The i18n loader and a few other places read these from the app root.
  for (const f of ["package.json"]) {
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
