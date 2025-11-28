import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"

export interface UserAnalyticsSummary {
  total_users: number
  active_users: number
  students: number
  instructors: number
  admins: number
}

export interface OverviewAnalyticsResponse {
  period: { start_date: string; end_date: string }
  users: Record<string, any>
  courses: Record<string, any>
  enrollments: Record<string, any>
  revenue: Record<string, any>
  certificates: Record<string, any>
}

export interface RevenueAnalyticsResponse {
  period: { start_date: string; end_date: string }
  summary: Record<string, any>
  revenue_over_time: Array<Record<string, any>>
  revenue_by_course: Array<Record<string, any>>
  revenue_by_instructor: Array<Record<string, any>>
}

class AnalyticsService {
  // GET /api/analytics/users
  async getUserAnalytics(): Promise<UserAnalyticsSummary> {
    return await apiClient.get<UserAnalyticsSummary>(`${API_ENDPOINTS.analytics}/users`)
  }

  // GET /api/analytics/overview?start_date=&end_date=
  async getOverview(params?: { start_date?: string; end_date?: string }): Promise<OverviewAnalyticsResponse> {
    const sp = new URLSearchParams()
    if (params?.start_date) sp.set("start_date", params.start_date)
    if (params?.end_date) sp.set("end_date", params.end_date)
    const url = `${API_ENDPOINTS.analytics}/overview${sp.toString() ? `?${sp.toString()}` : ""}`
    return await apiClient.get<OverviewAnalyticsResponse>(url)
  }

  // GET /api/analytics/revenue?start_date=&end_date=&group_by=
  async getRevenue(params?: { start_date?: string; end_date?: string; group_by?: "day" | "week" | "month" }): Promise<RevenueAnalyticsResponse> {
    const sp = new URLSearchParams()
    if (params?.start_date) sp.set("start_date", params.start_date)
    if (params?.end_date) sp.set("end_date", params.end_date)
    if (params?.group_by) sp.set("group_by", params.group_by)
    const url = `${API_ENDPOINTS.analytics}/revenue${sp.toString() ? `?${sp.toString()}` : ""}`
    return await apiClient.get<RevenueAnalyticsResponse>(url)
  }

  // GET /api/analytics/engagement?start_date=&end_date=
  async getEngagement(params?: { start_date?: string; end_date?: string }): Promise<any> {
    const sp = new URLSearchParams()
    if (params?.start_date) sp.set("start_date", params.start_date)
    if (params?.end_date) sp.set("end_date", params.end_date)
    const url = `${API_ENDPOINTS.analytics}/engagement${sp.toString() ? `?${sp.toString()}` : ""}`
    return await apiClient.get<any>(url)
  }

  // GET /api/analytics/courses/{course_id}
  async getCourseAnalytics(courseId: string, params?: { start_date?: string; end_date?: string }): Promise<any> {
    const sp = new URLSearchParams()
    if (params?.start_date) sp.set("start_date", params.start_date)
    if (params?.end_date) sp.set("end_date", params.end_date)
    const url = `${API_ENDPOINTS.analytics}/courses/${courseId}${sp.toString() ? `?${sp.toString()}` : ""}`
    return await apiClient.get<any>(url)
  }

  // GET /api/analytics/instructors/{instructor_id}
  async getInstructorAnalytics(instructorId: string, params?: { start_date?: string; end_date?: string }): Promise<any> {
    const sp = new URLSearchParams()
    if (params?.start_date) sp.set("start_date", params.start_date)
    if (params?.end_date) sp.set("end_date", params.end_date)
    const url = `${API_ENDPOINTS.analytics}/instructors/${instructorId}${sp.toString() ? `?${sp.toString()}` : ""}`
    return await apiClient.get<any>(url)
  }
}

export const analyticsService = new AnalyticsService()
