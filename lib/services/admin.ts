import { API_ENDPOINTS } from "../api-config"
import { apiClient as api } from "../api-client"

export interface TopCourse {
  id: string
  title: string
  enrollment_count: number
  thumbnail_url: string | null
}

export interface RecentUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  created_at: string
}

export interface AdminDashboardStats {
  total_users: number
  total_students: number
  total_instructors: number
  total_courses: number
  total_enrollments: number
  total_completions: number
  total_certificates: number
  total_revenue: number
  new_users_30d: number
  new_courses_30d: number
  new_enrollments_30d: number
  new_certificates_30d: number
  top_courses: TopCourse[]
  recent_users: RecentUser[]
}

export const adminService = {
  getDashboardStats: async (period?: string): Promise<AdminDashboardStats> => {
    const url = period ? `${API_ENDPOINTS.adminDashboard}?period=${period}` : API_ENDPOINTS.adminDashboard
    return await api.get<AdminDashboardStats>(url)
  },

  getUsers: async (params?: any): Promise<any> => {
    const query = new URLSearchParams(params).toString()
    const url = query ? `${API_ENDPOINTS.adminUsers}?${query}` : API_ENDPOINTS.adminUsers
    return await api.get<any>(url)
  },

  getCourses: async (params?: any): Promise<any> => {
    const query = new URLSearchParams(params).toString()
    const url = query ? `${API_ENDPOINTS.adminCourses}?${query}` : API_ENDPOINTS.adminCourses
    return await api.get<any>(url)
  },
}
