import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "data/**",
    "db/migrations/**",
    "next-env.d.ts",
    // The Electron shell is a separate CommonJS project with its own package.json;
    // it must not be linted by the Next.js/TypeScript rules.
    "desktop/**",
  ]),
])
