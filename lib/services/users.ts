import { ApiResponse, PaginatedApiResponse } from "@/types/api"
import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"
import type { BasicUser, RegisterRequest, User } from "./auth"

export interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  phone?: string
  bio?: string
  location?: string
  occupation?: string
}

export interface TokenTransaction {
  id: string
  user_id: string
  amount: number
  transaction_type: "credit" | "debit"
  description: string
  created_at: string
}

export interface TokenBalanceResponse {
  balance: number
  transactions: TokenTransaction[]
}

/**
 * Lightweight caching for current user data
 */
let cachedUser: User | null = null

class UsersService {
  private handleError(context: string, error: unknown): never {
    console.error(`${context} failed:`, error)
    throw error instanceof Error ? error : new Error(`${context} failed due to an unexpected error`)
  }

  async addUser(data: BasicUser): Promise<ApiResponse<User>> {
    try {
      return await apiClient.post<ApiResponse<User>>(API_ENDPOINTS.adminUsers, data)
    } catch (error) {
      this.handleError("Add user", error)
    }
  }

  async getUsers(): Promise<PaginatedApiResponse<User>> {
    try {
      return await apiClient.get<PaginatedApiResponse<User>>(API_ENDPOINTS.users)
    } catch (error) {
      this.handleError("Get users", error)
    }
  }

  async getProfile(userId: string): Promise<User> {
    try {
      return await apiClient.get<User>(API_ENDPOINTS.userProfile(userId))
    } catch (error) {
      this.handleError("Get user profile", error)
    }
  }

  async getCurrentUserProfile(forceRefresh = false): Promise<User> {
    try {
      if (cachedUser && !forceRefresh) return cachedUser

      const user = await apiClient.get<User>(API_ENDPOINTS.currentUser)
      console.log(user, "the user data is fetched: getCurrentUserProfile")
      cachedUser = user
      return user
    } catch (error) {
      console.log(error, "the error is fetched: getCurrentUserProfile")
      this.handleError("Get current user profile", error)
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.patch<ApiResponse<User>>(API_ENDPOINTS.updateProfile, data)

      if (response.success && response.data) {
        cachedUser = response.data // keep cache in sync
      }

      return response
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unknown error occurred while updating profile",
      }
    }
  }

  async uploadAvatar(file: File): Promise<User> {
    try {
      const user = await apiClient.uploadFile<User>(API_ENDPOINTS.uploadAvatar, file)
      cachedUser = user
      return user
    } catch (error) {
      this.handleError("Upload avatar", error)
    }
  }

  async getTokenBalance(): Promise<TokenBalanceResponse> {
    try {
      return await apiClient.get<TokenBalanceResponse>(API_ENDPOINTS.tokenBalance)
    } catch (error) {
      this.handleError("Get token balance", error)
    }
  }

  clearCache(): void {
    cachedUser = null
  }
}

export const usersService = new UsersService()
