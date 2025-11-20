"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { setCookie, getCookie, deleteCookie } from "cookies-next"
import { authService, type User } from "../services/auth"
import { usersService, type TokenBalanceResponse } from "../services/users"
import { COOKIE_NAMES, COOKIE_OPTIONS } from "../api-config"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  tokenBalance: TokenBalanceResponse | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshTokenBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokenBalance, setTokenBalance] = useState<TokenBalanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getCookie(COOKIE_NAMES.accessToken)
        if (token) {
          // Access token exists, fetch user data
          await refreshUser()
          await refreshTokenBalance()
        } else {
          // No access token, try to refresh using HTTP-only refresh token
          // This handles page refresh scenarios where access token might be expired
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/refresh`,
              {
                method: "POST",
                credentials: "include", // Send HTTP-only cookie
              }
            )

            if (response.ok) {
              const data = await response.json()
              setCookie(COOKIE_NAMES.accessToken, data.access_token, COOKIE_OPTIONS)
              await refreshUser()
              await refreshTokenBalance()
            }
          } catch (refreshError) {
            console.log("No valid refresh token available")
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        await authService.logout()
        deleteCookie(COOKIE_NAMES.accessToken)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })

      // Check if 2FA is required
      if ("requires_2fa" in response && response.requires_2fa) {
        // Return the 2FA response to the caller to handle
        throw new Error("2FA_REQUIRED")
      }

      // Normal login - response is a User object
      if (response) {
        setUser(response)
        await refreshTokenBalance()
      }
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (userData: any) => {
    try {
      const user = await authService.register(userData)
      if (user) {
        setUser(user)
        await refreshTokenBalance()
      }
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      deleteCookie(COOKIE_NAMES.accessToken)
      deleteCookie(COOKIE_NAMES.userId)
      // Note: refresh_token HTTP-only cookie is cleared by backend
      setUser(null)
      setTokenBalance(null)
      usersService.clearCache()
    }
  }

  const refreshUser = async () => {
    try {
      const user = await usersService.getCurrentUserProfile(true)
      if (user) setUser(user)
    } catch (error) {
      console.error("Failed to refresh user:", error)
      await logout()
    }
  }

  const refreshTokenBalance = async () => {
    try {
      const balanceData = await usersService.getTokenBalance()
      if (balanceData) setTokenBalance(balanceData)
    } catch (error) {
      console.error("Failed to refresh token balance:", error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    tokenBalance,
    login,
    register,
    logout,
    refreshUser,
    refreshTokenBalance,
  }

  return <AuthContext.Provider value={value}>{!isLoading && children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
