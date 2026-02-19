"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
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
  const [theme, setTheme] = useState<TenantTheme | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTheme = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use apiClient which automatically adds X-Tenant-Domain header
      const data = await apiClient.get<TenantTheme>(API_ENDPOINTS.siteTheme)
      setTheme(data)

      // Apply theme colors to CSS variables
      applyThemeColorsWithForeground({
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        accent_color: data.accent_color,
      })
    } catch (err) {
      console.error("Error fetching tenant theme:", err)
      setError(err instanceof Error ? err.message : "Failed to load theme")

      // Apply default theme colors on error
      applyThemeColorsWithForeground({
        primary_color: "#ef4444",
        secondary_color: "#3b82f6",
        accent_color: "#8b5cf6",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTheme()
  }, [])

  return (
    <TenantThemeContext.Provider value={{ theme, isLoading, error, refreshTheme: fetchTheme }}>
      {children}
    </TenantThemeContext.Provider>
  )
}

