import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isLocale } from "@/lib/i18n/routing"
import { cn } from "@/lib/utils"

// Fonts ship with the app (npm, SIL OFL); nothing is fetched from a font CDN
const inter = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      weight: "100 900",
    },
    {
      path: "../node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2",
      weight: "100 900",
    },
  ],
  variable: "--font-inter",
  display: "swap",
})
const mono = localFont({
  src: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brand")
  const name = t("name")
  return {
    title: { default: name, template: `%s · ${name}` },
    description:
      "Self-hosted AI agents on your own keys: a sandboxed Linux workstation, long-term memory and any model per agent, reachable from Telegram.",
    applicationName: name,
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14151a" },
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
  ],
}

// Everything is read from the local database at request time
export const dynamic = "force-dynamic"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  const resolvedLocale = isLocale(locale) ? locale : "zh"

  return (
    <html
      lang={resolvedLocale}
      suppressHydrationWarning
      className={cn(inter.variable, mono.variable)}
    >
      {/* Browser extensions add attributes to <body> before React loads */}
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
          <ThemeProvider>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
