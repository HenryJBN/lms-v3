// src/services/auth.service.ts

import { apiClient } from "../api-client"
import { API_ENDPOINTS, COOKIE_NAMES, COOKIE_OPTIONS } from "../api-config"
import { setCookie, deleteCookie, getCookie } from "cookies-next"

//
// --- Interfaces ---
//
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  full_name: string
  role?: "student" | "instructor" | "admin"
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: string
  is_active: boolean
  is_verified: boolean
  profile_image_url?: string
  bio?: string
  location?: string
  occupation?: string
  token_balance: number
  created_at: string
}

export interface AuthResponse {
  success: boolean
  access_token: string
  token_type: string
  user: User
  // Note: refresh_token is now sent as HTTP-only cookie from backend
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface TwoFactorAuthResponse {
  requires_2fa: boolean
  session_id: string
  message: string
}

export interface TwoFactorVerifyRequest {
  session_id: string
  code: string
}

//
// --- Helper Functions ---
//
// Note: Token storage is now handled by AuthContext
// These helpers are kept for backwards compatibility but will be removed

const storeUserId = (userId: string) => {
  setCookie(COOKIE_NAMES.userId, userId, COOKIE_OPTIONS)
}

const clearUserId = () => {
  deleteCookie(COOKIE_NAMES.userId)
}

//
// --- AuthService ---
//
class AuthService {
  private async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      return await apiClient.post<T>(endpoint, data)
    } catch (error: any) {
      console.error(`Error on ${endpoint}:`, error?.response?.data || error)
      throw new Error(error || error?.response?.data || "Something went wrong. Please try again.")
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse | TwoFactorAuthResponse> {
    const response = await this.post<AuthResponse | TwoFactorAuthResponse>(
      API_ENDPOINTS.login,
      data
    )

    // Check if 2FA is required
    if ("requires_2fa" in response && response.requires_2fa) {
      return response as TwoFactorAuthResponse
    }

    // Normal login response - store user_id cookie
    const auth = response as AuthResponse
    storeUserId(auth.user.id)
    return auth
  }

  async verify2FA(data: TwoFactorVerifyRequest): Promise<AuthResponse> {
    const auth = await this.post<AuthResponse>(API_ENDPOINTS.verify2FA, data)
    storeUserId(auth.user.id)
    return auth
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const auth = await this.post<AuthResponse>(API_ENDPOINTS.register, data)
    storeUserId(auth.user.id)
    return auth
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.logout)
    } catch (error) {
      console.warn("Logout API failed, clearing cookies anyway:", error)
    } finally {
      clearUserId()
    }
  }

  async getCurrentUser(): Promise<User> {
    return await this.post<User>(API_ENDPOINTS.currentUser)
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    return await this.post<{ message: string }>(API_ENDPOINTS.forgotPassword, data)
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return await this.post<{ message: string }>(API_ENDPOINTS.resetPassword, data)
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return await this.post<{ message: string }>(API_ENDPOINTS.verifyEmail, {
      token,
    })
  }

  getAccessToken(): string | null {
    // Note: This method is deprecated. Use AuthContext.accessToken instead.
    // Access token is stored in React state, not accessible from this service.
    console.warn("authService.getAccessToken() is deprecated. Use AuthContext.accessToken instead.")
    return null
  }

  isAuthenticated(): boolean {
    // Note: This method is deprecated. Use AuthContext.isAuthenticated instead.
    console.warn(
      "authService.isAuthenticated() is deprecated. Use AuthContext.isAuthenticated instead."
    )
    return false
  }

  getUserId(): string | null {
    const id = getCookie(COOKIE_NAMES.userId)
    return typeof id === "string" ? id : null
  }
}

export const authService = new AuthService()
