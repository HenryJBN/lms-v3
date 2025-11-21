import { API_BASE_URL, API_ENDPOINTS, REQUEST_TIMEOUT } from "./api-config"

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message)
    this.name = "ApiError"
  }
}

class ApiClient {
  private baseURL: string
  private _accessToken: string | null = null
  private tokenUpdater: ((token: string | null) => void) | null = null

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  // TypeScript getter/setter for access token
  get token(): string | null {
    return this._accessToken
  }

  set token(value: string | null) {
    this._accessToken = value
  }

  // Set the callback to update AuthContext when token is refreshed
  setTokenUpdater(updater: (token: string | null) => void) {
    this.tokenUpdater = updater
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      // Refresh token is sent automatically as HTTP-only cookie
      const response = await fetch(`${this.baseURL}${API_ENDPOINTS.refreshToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: send HTTP-only cookies
      })

      if (response.ok) {
        const data = await response.json()
        // Update access token in memory
        this.token = data.access_token
        // Notify AuthContext of the new token
        if (this.tokenUpdater) {
          this.tokenUpdater(data.access_token)
        }
        return true
      }
      return false
    } catch (error) {
      console.error("Token refresh failed:", error)
      return false
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      credentials: "include",
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
    config.signal = controller.signal

    try {
      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry the request with new token
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${this.token}`,
          }
          const retryResponse = await fetch(url, config)
          if (retryResponse.ok) {
            return await retryResponse.json()
          }
        }
        // If refresh failed, throw error
        throw new ApiError(401, "Authentication failed")
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new ApiError(
          response.status,
          error.detail || error.message || "An error occurred",
          error
        )
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return await response.json()
      }

      return {} as T
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof ApiError) {
        throw error
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(408, "Request timeout")
      }
      throw new ApiError(500, "Network error occurred")
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData()
    formData.append("file", file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const url = `${this.baseURL}${endpoint}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(response.status, error.detail || error.message || "Upload failed", error)
    }

    return await response.json()
  }
}

export const apiClient = new ApiClient()
