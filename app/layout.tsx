import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TenantThemeProvider } from "@/components/tenant-theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { LayoutWrapper } from "@/components/layout-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DCA LMS - Learn Blockchain, AI, Web Development & More",
  description: "Master cutting-edge technologies with our comprehensive learning management system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TenantThemeProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TenantThemeProvider>
      </body>
    </html>
  )
}
