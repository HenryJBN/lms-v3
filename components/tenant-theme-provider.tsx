"use client"

import React, { createContext, useContext, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { applyThemeColorsWithForeground } from "@/lib/utils/theme"
import { apiClient } from "@/lib/api-client"
import { API_ENDPOINTS } from "@/lib/api-config"

interface TenantTheme {
  site_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
}

interface TenantThemeContextType {
  theme: TenantTheme | null
  isLoading: boolean
  error: string | null
  refreshTheme: () => Promise<void>
}

const TenantThemeContext = createContext<TenantThemeContextType>({
  theme: null,
  isLoading: true,
  error: null,
  refreshTheme: async () => {},
})

export function useTenantTheme() {
  return useContext(TenantThemeContext)
}

interface TenantThemeProviderProps {
  children: React.ReactNode
}

export function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const [isGlobal, setIsGlobal] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const hostname = window.location.hostname
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "dcalms.test"
    setIsGlobal(
      hostname === baseDomain || 
      hostname === "localhost" || 
      hostname === "127.0.0.1" || 
      hostname === `www.${baseDomain}`
    )
  }, [])

  const { data: theme, isLoading, error: queryError, refetch: refreshTheme } = useQuery({
    queryKey: ["siteTheme", isGlobal],
    queryFn: () => apiClient.get<TenantTheme>(isGlobal ? API_ENDPOINTS.siteGlobalTheme : API_ENDPOINTS.siteTheme),
    enabled: isGlobal !== null,
    staleTime: Infinity, // Theme rarely changes
  })

  const error = queryError ? (queryError as Error).message : null

  useEffect(() => {
    if (theme) {
      applyThemeColorsWithForeground({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
      })
    } else if (error) {
      applyThemeColorsWithForeground({
        primary_color: "#ef4444",
        secondary_color: "#3b82f6",
        accent_color: "#8b5cf6",
      })
    }
  }, [theme, error])

  return (
    <TenantThemeContext.Provider value={{ theme: theme ?? null, isLoading, error, refreshTheme: async () => { await refreshTheme() } }}>
      {children}
    </TenantThemeContext.Provider>
  )
}

