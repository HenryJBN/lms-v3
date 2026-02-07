import { API_ENDPOINTS } from "../api-config"
import { apiClient as api } from "../api-client"

export interface GlobalStats {
  total_sites: number
  total_users: number
  total_courses: number
  total_enrollments: number
  new_sites_30d: number
  new_users_30d: number
}

export interface ActivityItem {
  id: string
  type: 'site_registered' | 'user_joined' | 'course_enrollment'
  title: string
  description: string
  timestamp: string
}

export interface GrowthData {
  month: string
  sites: number
  users: number
  enrollments: number
  timestamp: string
}

export interface SiteResponse {
  id: string
  name: string
  subdomain: string
  domain: string
  is_active: boolean
  created_at: string
  user_count: number
  course_count: number
}

const buildUrl = (baseUrl: string, params?: any) => {
  if (!params) return baseUrl
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value))
    }
  })
  const queryString = query.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

export const systemAdminService = {
  getGlobalStats: async (): Promise<GlobalStats> => {
    return await api.get<GlobalStats>(API_ENDPOINTS.systemAdminGlobalStats)
  },

  getGlobalActivity: async (limit: number = 5): Promise<ActivityItem[]> => {
    return await api.get<ActivityItem[]>(`${API_ENDPOINTS.systemAdminActivity}?limit=${limit}`)
  },

  getGrowthStats: async (months: number = 6): Promise<GrowthData[]> => {
    return await api.get<GrowthData[]>(`${API_ENDPOINTS.systemAdminGrowth}?months=${months}`)
  },

  getAllSites: async (params?: any): Promise<{ items: SiteResponse[], total: number, pages: number }> => {
    const url = buildUrl(API_ENDPOINTS.systemAdminSites, params)
    return await api.get<{ items: SiteResponse[], total: number, pages: number }>(url)
  },

  getSiteDetails: async (siteId: string): Promise<SiteResponse> => {
    return await api.get<SiteResponse>(`${API_ENDPOINTS.systemAdminSites}/${siteId}`)
  },

  updateSiteStatus: async (siteId: string, data: { is_active: boolean }): Promise<SiteResponse> => {
    return await api.patch<SiteResponse>(`${API_ENDPOINTS.systemAdminSites}/${siteId}`, data)
  }
}

export const onboardingService = {
  checkSubdomain: async (subdomain: string): Promise<{ available: boolean, message: string }> => {
    return await api.post<{ available: boolean, message: string }>(API_ENDPOINTS.checkSubdomain, { subdomain, available: false })
  },

  registerTenant: async (data: any): Promise<any> => {
    return await api.post<any>(API_ENDPOINTS.registerTenant, data)
  }
}
