// src/services/auth.service.ts

import { apiClient } from "../api-client";
import { API_ENDPOINTS, COOKIE_NAMES, COOKIE_OPTIONS } from "../api-config";
import { setCookie, deleteCookie, getCookie } from "cookies-next";

//
// --- Interfaces ---
//
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  full_name: string;
  role?: "student" | "instructor" | "admin";
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  token_balance: number;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

//
// --- Helper Functions ---
//
const storeTokens = (auth: AuthResponse) => {
  setCookie(COOKIE_NAMES.accessToken, auth.access_token, COOKIE_OPTIONS);
  setCookie(COOKIE_NAMES.refreshToken, auth.refresh_token, COOKIE_OPTIONS);
  setCookie(COOKIE_NAMES.userId, auth.user.id, COOKIE_OPTIONS);
};

const clearTokens = () => {
  deleteCookie(COOKIE_NAMES.accessToken);
  deleteCookie(COOKIE_NAMES.refreshToken);
  deleteCookie(COOKIE_NAMES.userId);
};

//
// --- AuthService ---
//
class AuthService {
  private async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      return await apiClient.post<T>(endpoint, data);
    } catch (error: any) {
      console.error(`Error on ${endpoint}:`, error?.response?.data || error);
      throw new Error(
        error?.response?.data?.detail ||
          "Something went wrong. Please try again."
      );
    }
  }

  async login(data: LoginRequest): Promise<User> {
    const auth = await this.post<AuthResponse>(API_ENDPOINTS.login, data);
    storeTokens(auth);
    return auth.user;
  }

  async register(data: RegisterRequest): Promise<User> {
    const auth = await this.post<AuthResponse>(API_ENDPOINTS.register, data);
    storeTokens(auth);
    return auth.user;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.logout);
    } catch (error) {
      console.warn("Logout API failed, clearing cookies anyway:", error);
    } finally {
      clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    return await this.post<User>(API_ENDPOINTS.currentUser);
  }

  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<{ message: string }> {
    return await this.post<{ message: string }>(
      API_ENDPOINTS.forgotPassword,
      data
    );
  }

  async resetPassword(
    data: ResetPasswordRequest
  ): Promise<{ message: string }> {
    return await this.post<{ message: string }>(
      API_ENDPOINTS.resetPassword,
      data
    );
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return await this.post<{ message: string }>(API_ENDPOINTS.verifyEmail, {
      token,
    });
  }

  getAccessToken(): string | null {
    const token = getCookie(COOKIE_NAMES.accessToken);
    return typeof token === "string" ? token : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getUserId(): string | null {
    const id = getCookie(COOKIE_NAMES.userId);
    return typeof id === "string" ? id : null;
  }
}

export const authService = new AuthService();
