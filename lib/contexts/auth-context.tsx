"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { deleteCookie } from "cookies-next"
import { authService, type User, type RegisterResponse } from "../services/auth"
import { usersService, type TokenBalanceResponse } from "../services/users"
import { API_ENDPOINTS, COOKIE_NAMES } from "../api-config"
import { apiClient } from "../api-client"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  tokenBalance: TokenBalanceResponse | null
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<RegisterResponse>
  verifyEmailCode: (code: string, email: string) => Promise<any>
  resendVerificationCode: (email: string) => Promise<any>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshTokenBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokenBalance, setTokenBalance] = useState<TokenBalanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const isAuthenticated = !!user && !!accessToken

  // Set up token updater callback once on mount
  useEffect(() => {
    apiClient.setTokenUpdater(setAccessToken)
  }, [])

  // Sync access token with api-client whenever it changes
  useEffect(() => {
    apiClient.token = accessToken
  }, [accessToken])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Always try to refresh using HTTP-only refresh token on app load
        // This handles page refresh scenarios where access token in memory is lost
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${API_ENDPOINTS.refreshToken}`,
            {
              method: "POST",
              credentials: "include", // Send HTTP-only cookie
            }
          )

          if (response.ok) {
            const data = await response.json()
            apiClient.token = data.access_token
            console.log("Refresh response:", data)
            // Store access token in memory (state)
            setAccessToken(data.access_token)
            await refreshUser()
            await refreshTokenBalance()
          }
        } catch (refreshError) {
          console.log("No valid refresh token available")
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        setAccessToken(null)
        setUser(null)
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

      // Normal login - response is AuthResponse with user and access_token
      if ("user" in response && "access_token" in response) {
        setAccessToken(response.access_token)
        setUser(response.user)
        await refreshTokenBalance()
      }
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (userData: any) => {
    try {
      const response = await authService.register(userData)
      // For email verification flow, return the response to handle verification
      return response
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const verifyEmailCode = async (code: string, email: string) => {
    try {
      const response = await authService.verifyEmailCode(code, email)
      if (response) {
        setAccessToken(response.access_token)
        setUser(response.user)
        await refreshTokenBalance()
      }
      return response
    } catch (error) {
      console.error("Email verification failed:", error)
      throw error
    }
  }

  const resendVerificationCode = async (email: string) => {
    try {
      const response = await authService.resendVerificationCode(email)
      return response
    } catch (error) {
      console.error("Resend verification code failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      // Clear access token from memory
      setAccessToken(null)
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
      console.log(user, "the user data is fetched")
      if (user) setUser(user)
    } catch (error) {
      console.error("Failed to refresh user:", error)
      // await logout()
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
    accessToken,
    setAccessToken,
    login,
    register,
    verifyEmailCode,
    resendVerificationCode,
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
