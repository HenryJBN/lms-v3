// types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedApiResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
