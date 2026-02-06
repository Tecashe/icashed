import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: {
    default: "Radaa - Real-Time Public Transport Visibility",
    template: "%s | Radaa",
  },
  description:
    "See live routes, vehicles, and stages across Kenya. Make informed transport decisions based on real movement, not guesswork.",
  keywords: [
    "Kenya",
    "matatu",
    "public transport",
    "real-time",
    "routes",
    "Nairobi",
    "Mombasa",
    "transit",
  ],
  authors: [{ name: "Radaa" }],
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "Radaa",
    title: "Radaa - Real-Time Public Transport Visibility",
    description:
      "Live visibility into Kenya's public transport. See active routes, vehicle positions, and stages in real time.",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10B981" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1722" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            theme="dark"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
